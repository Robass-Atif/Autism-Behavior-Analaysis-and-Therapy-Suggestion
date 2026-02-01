import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient } from './schemas/patient.schema';
import { PatientCaregiver } from './schemas/patient-caregiver.schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, AccountStatus } from '../../common/enums/role.enum';

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(PatientCaregiver.name)
    private patientCaregiverModel: Model<PatientCaregiver>,
  ) { }

  // Create new patient (therapist only)
  async createPatient(therapistId: string, dto: CreatePatientDto) {
    // Check if MRN already exists
    const existingPatient = await this.patientModel.findOne({ mrn: dto.mrn });

    if (existingPatient) {
      throw new ConflictException(
        `Patient with MRN ${dto.mrn} already exists`,
      );
    }

    const user = new this.userModel({
      fullName: dto.fullName,
      email: `${dto.mrn}@patient.neurocare.com`, // Generated placeholder email
      password: dto.mrn, // Default password is MRN
      role: Role.PATIENT,
      accountStatus: AccountStatus.ACTIVE,
    });
    const savedUser = await user.save();

    const patient = new this.patientModel({
      ...dto,
      userId: savedUser._id,
      therapistId,
      status: 'active',
      deleted: false,
    });

    await patient.save();

    return {
      success: true,
      message: 'Patient created successfully',
      patient: {
        id: patient._id,
        mrn: patient.mrn,
        fullName: patient.fullName,
        therapistId: patient.therapistId,
        status: patient.status,
        createdAt: patient.createdAt,
      },
    };
  }

  // Get therapist's OWN patients only
  async getTherapistPatients(
    therapistId: string,
    params: {
      status?: string;
      search?: string;
      page: number;
      limit: number;
    },
  ) {
    const { status, search, page, limit } = params;

    const query: any = {
      therapistId,
      deleted: false,
    };

    if (status) {
      query.status = status;
    }

    // Search by name or MRN
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mrn: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      this.patientModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.patientModel.countDocuments(query),
    ]);

    return {
      patients: patients.map((p) => ({
        id: p._id,
        mrn: p.mrn,
        fullName: p.fullName,
        dob: p.dob,
        gender: p.gender,
        status: p.status,
        asdSeverity: p.asdSeverity,
        progressScore: p.progressScore,
        diagnosisDate: p.diagnosisDate,
        createdAt: p.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  // Get patient by ID (with access check)
  async getPatientById(patientId: string, userId: string, userRole: string) {
    const patient = await this.patientModel.findById(patientId);

    if (!patient || patient.deleted) {
      throw new NotFoundException('Patient not found');
    }

    // Access control
    if (userRole === 'THERAPIST') {
      if (patient.therapistId.toString() !== userId) {
        throw new ForbiddenException(
          'You can only access your own patients',
        );
      }
    } else if (userRole === 'CAREGIVER') {
      // Check if caregiver is linked to this patient
      const link = await this.patientCaregiverModel.findOne({
        patientId: patient._id,
        caregiverId: userId,
        status: 'active',
      });

      if (!link) {
        throw new ForbiddenException('You do not have access to this patient');
      }
    }

    return patient;
  }

  // Get caregivers linked to therapist (for cascade operations)
  async getCaregiversLinkedToTherapist(therapistId: string) {
    // Find all patients belonging to this therapist
    const patients = await this.patientModel
      .find({ therapistId, deleted: false })
      .select('_id')
      .exec();

    const patientIds = patients.map((p) => p._id);

    // Find all caregivers linked to these patients
    const links = await this.patientCaregiverModel
      .find({
        patientId: { $in: patientIds },
        status: 'active',
      })
      .populate('caregiverId')
      .exec();

    // Return unique caregiver IDs
    const caregiverIds = [
      ...new Set(links.map((link) => link.caregiverId.toString())),
    ];

    return caregiverIds;
  }

  // Count patients for therapist
  async countPatientsForTherapist(therapistId: string): Promise<number> {
    return this.patientModel.countDocuments({
      therapistId,
      deleted: false,
    });
  }

  // Get all patients (admin only - cross-therapist access)
  async getAllPatients(params: {
    therapistId?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const { therapistId, status, page, limit } = params;

    const query: any = { deleted: false };

    if (therapistId) {
      query.therapistId = therapistId;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      this.patientModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('therapistId', 'fullName email')
        .sort({ createdAt: -1 })
        .exec(),
      this.patientModel.countDocuments(query),
    ]);

    return {
      patients: patients.map((p) => ({
        id: p._id,
        mrn: p.mrn,
        fullName: p.fullName,
        dob: p.dob,
        gender: p.gender,
        status: p.status,
        asdSeverity: p.asdSeverity,
        progressScore: p.progressScore,
        therapist: (p.therapistId as any)?.fullName || 'Unknown',
        therapistEmail: (p.therapistId as any)?.email,
        createdAt: p.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  // Link caregiver to patient (used during caregiver registration)
  async linkCaregiverToPatient(patientId: string, caregiverId: string) {
    const patient = await this.patientModel.findById(patientId);

    if (!patient || patient.deleted) {
      throw new NotFoundException('Patient not found');
    }

    // Check if link already exists
    const existingLink = await this.patientCaregiverModel.findOne({
      patientId,
      caregiverId,
    });

    if (existingLink) {
      if (existingLink.status === 'revoked') {
        // Reactivate revoked link
        existingLink.status = 'active';
        await existingLink.save();
        return { success: true, message: 'Link reactivated' };
      }
      return { success: true, message: 'Link already exists' };
    }

    const link = new this.patientCaregiverModel({
      patientId,
      caregiverId,
      status: 'active',
    });

    await link.save();

    return {
      success: true,
      message: 'Caregiver linked to patient successfully',
    };
  }

  // Get caregiver's linked patients
  async getCaregiverPatients(caregiverId: string) {
    const links = await this.patientCaregiverModel
      .find({
        caregiverId,
        status: 'active',
      })
      .populate({
        path: 'patientId',
        populate: {
          path: 'therapistId',
          select: 'fullName email phone',
        },
      })
      .exec();

    const patients = links
      .filter((link) => link.patientId && !(link.patientId as any).deleted)
      .map((link) => {
        const patient = link.patientId as any;
        const therapist = patient.therapistId;

        return {
          id: patient._id,
          fullName: patient.fullName,
          dob: patient.dob,
          gender: patient.gender,
          status: patient.status,
          asdSeverity: patient.asdSeverity,
          progressScore: patient.progressScore,
          therapist: {
            id: therapist._id,
            name: therapist.fullName,
            email: therapist.email,
            phone: therapist.phone,
          },
        };
      });

    return { patients };
  }

  // Update patient
  async updatePatient(
    patientId: string,
    userId: string,
    userRole: string,
    updateData: Partial<CreatePatientDto>,
  ) {
    const patient = await this.patientModel.findById(patientId);

    if (!patient || patient.deleted) {
      throw new NotFoundException('Patient not found');
    }

    // Access control
    if (userRole === 'THERAPIST') {
      if (patient.therapistId.toString() !== userId) {
        throw new ForbiddenException(
          'You can only update your own patients',
        );
      }
    }

    // Update fields
    Object.assign(patient, updateData);
    patient.updatedAt = new Date();

    await patient.save();

    return {
      success: true,
      message: 'Patient updated successfully',
      patient: {
        id: patient._id,
        mrn: patient.mrn,
        fullName: patient.fullName,
        status: patient.status,
        updatedAt: patient.updatedAt,
      },
    };
  }

  // Delete patient (soft delete)
  async deletePatient(patientId: string, userId: string, userRole: string) {
    const patient = await this.patientModel.findById(patientId);

    if (!patient || patient.deleted) {
      throw new NotFoundException('Patient not found');
    }

    // Access control
    if (userRole === 'THERAPIST') {
      if (patient.therapistId.toString() !== userId) {
        throw new ForbiddenException(
          'You can only delete your own patients',
        );
      }
    }

    // Soft delete
    patient.deleted = true;
    patient.status = 'archived';
    patient.updatedAt = new Date();

    await patient.save();

    return {
      success: true,
      message: 'Patient deleted successfully',
    };
  }

  /**
   * Calculate and update patient progress based on therapy goals
   * Progress = (Achieved Goals / Total Active Goals) * 100
   */
  async calculatePatientProgress(patientId: string): Promise<number> {
    try {
      // Import TherapyGoal model dynamically to avoid circular dependency
      const TherapyGoal = this.patientModel.db.model('TherapyGoal');

      // Count total active goals (excluding discontinued)
      const totalGoals = await TherapyGoal.countDocuments({
        patientId,
        deleted: false,
        status: { $ne: 'discontinued' },
      });

      // Count achieved goals
      const achievedGoals = await TherapyGoal.countDocuments({
        patientId,
        deleted: false,
        status: { $in: ['achieved', 'completed'] },
      });

      // Calculate progress percentage
      const progressScore = totalGoals > 0
        ? Math.round((achievedGoals / totalGoals) * 100)
        : 0;

      // Update patient's progress score
      await this.patientModel.findByIdAndUpdate(
        patientId,
        { progressScore },
        { new: true }
      );

      return progressScore;
    } catch (error) {
      console.error(`Error calculating progress for patient ${patientId}:`, error);
      return 0;
    }
  }
  // Count all patients (for admin dashboard)
  async countTotalPatients(): Promise<number> {
    return this.patientModel.countDocuments({ deleted: false });
  }

  // Get patient's own profile (for patient role)
  async getPatientProfile(userId: string) {
    const patient = await this.patientModel.findOne({ userId });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    if (patient.deleted) {
      throw new NotFoundException('Patient profile is archived');
    }

    return {
      id: patient._id,
      fullName: patient.fullName,
      mrn: patient.mrn,
      dob: patient.dob,
      gender: patient.gender,
      diagnosis: patient.asdSeverity,
      diagnosisDate: patient.diagnosisDate,
      progressScore: patient.progressScore,
      therapistId: patient.therapistId,
      status: patient.status,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
    };
  }
}
