import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Patients')
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) { }

  // 1️⃣ POST /patients - Create patient (therapist only)
  @Post()
  @Roles(Role.THERAPIST)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new patient',
    description:
      'Therapist creates a new patient. TherapistId is auto-assigned from JWT.',
  })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  @ApiResponse({ status: 409, description: 'MRN already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a therapist' })
  async createPatient(
    @CurrentUser() user: any,
    @Body() dto: CreatePatientDto,
  ) {
    return this.patientsService.createPatient(user.sub, dto);
  }

  // 2️⃣ GET /therapists/me/patients - Get therapist's OWN patients
  @Get('/therapists/me/patients')
  @Roles(Role.THERAPIST)
  @ApiOperation({
    summary: "Get therapist's own patients",
    description: 'Therapist can only see their own patients (not others)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['Active', 'Inactive', 'Discharged'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Patients retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a therapist' })
  async getTherapistPatients(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.patientsService.getTherapistPatients(user.sub, {
      status,
      search,
      page: page || 1,
      limit: limit || 50,
    });
  }

  // 3️⃣ GET /caregivers/me/patients - Get caregiver's linked patients
  @Get('/caregivers/me/patients')
  @Roles(Role.CAREGIVER)
  @ApiOperation({
    summary: "Get caregiver's linked patients",
    description: 'Caregiver can only see patients they are linked to',
  })
  @ApiResponse({ status: 200, description: 'Patients retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a caregiver' })
  async getCaregiverPatients(@CurrentUser() user: any) {
    return this.patientsService.getCaregiverPatients(user.sub);
  }

  // 4️⃣ GET /patients/:id - Get single patient
  @Get(':id')
  @Roles(Role.THERAPIST, Role.ADMIN, Role.CAREGIVER)
  @ApiOperation({
    summary: 'Get patient by ID',
    description: 'Get detailed patient information by ID',
  })
  @ApiResponse({ status: 200, description: 'Patient retrieved' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized access' })
  async getPatientById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.getPatientById(id, user.sub, user.role);
  }

  // 5️⃣ PUT /patients/:id - Update patient
  @Put(':id')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({
    summary: 'Update patient',
    description: 'Update patient information',
  })
  @ApiResponse({ status: 200, description: 'Patient updated' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  async updatePatient(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateData: Partial<CreatePatientDto>,
  ) {
    return this.patientsService.updatePatient(id, user.sub, user.role, updateData);
  }

  // 6️⃣ DELETE /patients/:id - Delete patient
  @Delete(':id')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete patient',
    description: 'Soft delete or archive patient',
  })
  @ApiResponse({ status: 200, description: 'Patient deleted' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  async deletePatient(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.deletePatient(id, user.sub, user.role);
  }
}
