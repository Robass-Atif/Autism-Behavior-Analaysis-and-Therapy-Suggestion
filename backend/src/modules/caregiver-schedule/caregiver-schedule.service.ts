import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  CaregiverSchedule,
  CaregiverScheduleDocument,
} from "./schemas/caregiver-schedule.schema";
import { Role } from "../../common/enums/role.enum";

/** Enrich raw schedule docs: resolve caregiverName from populated User if not stored */
function enrichEntry(doc: any) {
  const populated = doc.caregiverId;
  const isPopulated = populated && typeof populated === "object";
  const resolvedName =
    doc.caregiverName ||
    (isPopulated ? populated.fullName || populated.email : null) ||
    "Caregiver";
  return {
    ...doc,
    caregiverId: isPopulated
      ? (populated._id || populated).toString()
      : doc.caregiverId?.toString(),
    caregiverName: resolvedName,
    caregiverEmail:
      doc.caregiverEmail || (isPopulated ? populated.email : undefined),
  };
}

@Injectable()
export class CaregiverScheduleService {
  constructor(
    @InjectModel(CaregiverSchedule.name)
    private scheduleModel: Model<CaregiverScheduleDocument>,
  ) {}

  /** Therapist creates a schedule entry for a caregiver */
  async create(
    therapistId: string,
    dto: {
      caregiverId: string;
      caregiverName?: string;
      patientId: string;
      patientName: string;
      actionType: string;
      scheduledDate: string;
      timeSlot?: string;
      notes?: string;
    },
  ) {
    const entry = new this.scheduleModel({
      therapistId: new Types.ObjectId(therapistId),
      caregiverId: new Types.ObjectId(dto.caregiverId),
      caregiverName: dto.caregiverName,
      patientId: new Types.ObjectId(dto.patientId),
      patientName: dto.patientName,
      actionType: dto.actionType,
      scheduledDate: new Date(dto.scheduledDate),
      timeSlot: dto.timeSlot,
      notes: dto.notes,
      status: "pending",
    });
    return entry.save();
  }

  /** Caregiver fetches only their own schedule entries */
  async findForCaregiver(caregiverId: string, month?: string) {
    const query: any = {
      caregiverId: new Types.ObjectId(caregiverId),
      deleted: { $ne: true },
    };

    if (month) {
      const [year, mon] = month.split("-").map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      query.scheduledDate = { $gte: start, $lt: end };
    }

    const docs = await this.scheduleModel
      .find(query)
      .populate("caregiverId", "fullName email")
      .sort({ scheduledDate: 1 })
      .lean();

    return docs.map(enrichEntry);
  }

  /** Therapist fetches all schedule entries they've created (optionally filter by caregiverId) */
  async findForTherapist(
    therapistId: string,
    caregiverId?: string,
    month?: string,
  ) {
    const query: any = {
      therapistId: new Types.ObjectId(therapistId),
      deleted: { $ne: true },
    };

    if (caregiverId) {
      query.caregiverId = new Types.ObjectId(caregiverId);
    }

    if (month) {
      const [year, mon] = month.split("-").map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      query.scheduledDate = { $gte: start, $lt: end };
    }

    const docs = await this.scheduleModel
      .find(query)
      .populate("caregiverId", "fullName email")
      .sort({ scheduledDate: 1 })
      .lean();

    return docs.map(enrichEntry);
  }

  /** Update entry status */
  async update(
    id: string,
    userId: string,
    userRole: string,
    data: {
      status?: string;
      timeSlot?: string;
      notes?: string;
      actionType?: string;
      scheduledDate?: string;
    },
  ) {
    const entry = await this.scheduleModel.findById(id);
    if (!entry || entry.deleted)
      throw new NotFoundException("Schedule entry not found");

    // Caregivers can only update status; therapists can update everything
    if (userRole === Role.CAREGIVER) {
      if (entry.caregiverId.toString() !== userId)
        throw new ForbiddenException();
      if (data.status) entry.status = data.status;
    } else {
      if (entry.therapistId.toString() !== userId)
        throw new ForbiddenException();
      if (data.status) entry.status = data.status;
      if (data.timeSlot !== undefined) entry.timeSlot = data.timeSlot;
      if (data.notes !== undefined) entry.notes = data.notes;
      if (data.actionType) entry.actionType = data.actionType;
      if (data.scheduledDate)
        entry.scheduledDate = new Date(data.scheduledDate);
    }

    return entry.save();
  }

  /** Soft delete */
  async remove(id: string, therapistId: string) {
    const entry = await this.scheduleModel.findById(id);
    if (!entry || entry.deleted)
      throw new NotFoundException("Schedule entry not found");
    if (entry.therapistId.toString() !== therapistId)
      throw new ForbiddenException();
    entry.deleted = true;
    return entry.save();
  }
}
