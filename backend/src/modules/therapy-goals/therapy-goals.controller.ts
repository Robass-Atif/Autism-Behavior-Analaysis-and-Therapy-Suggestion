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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TherapyGoalsService } from './therapy-goals.service';
import { PatientsService } from '../patients/patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Therapy Goals')
@Controller('therapy-goals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TherapyGoalsController {
    constructor(
        private readonly goalsService: TherapyGoalsService,
        private readonly patientsService: PatientsService,
    ) { }

    @Get('me')
    @Roles(Role.PATIENT)
    @ApiOperation({ summary: 'Get my therapy goals' })
    @ApiResponse({ status: 200, description: 'My goals retrieved' })
    async getMyGoals(@CurrentUser() user: any) {
        const profile = await this.patientsService.getPatientProfile(user.sub);
        return this.goalsService.findByPatient(profile.id.toString());
    }

    @Post()
    @Roles(Role.THERAPIST)
    @ApiOperation({ summary: 'Create a new therapy goal' })
    @ApiResponse({ status: 201, description: 'Goal created' })
    async create(@CurrentUser() user: any, @Body() data: any) {
        const goal = await this.goalsService.create(user.sub, data);
        return { success: true, goal };
    }

    @Get()
    @Roles(Role.THERAPIST)
    @ApiOperation({ summary: 'Get all therapy goals for therapist' })
    @ApiQuery({ name: 'patientId', required: false })
    @ApiQuery({ name: 'status', required: false, enum: ['active', 'completed', 'archived'] })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Goals retrieved' })
    async findAll(
        @CurrentUser() user: any,
        @Query('patientId') patientId?: string,
        @Query('status') status?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.goalsService.findByTherapist(user.sub, {
            patientId,
            status,
            page: page || 1,
            limit: limit || 50,
        });
    }

    @Get('stats')
    @Roles(Role.THERAPIST)
    @ApiOperation({ summary: 'Get therapy goals statistics' })
    @ApiResponse({ status: 200, description: 'Stats retrieved' })
    async getStats(@CurrentUser() user: any) {
        return this.goalsService.getStats(user.sub);
    }

    @Get(':id')
    @Roles(Role.THERAPIST)
    @ApiOperation({ summary: 'Get a single therapy goal' })
    @ApiResponse({ status: 200, description: 'Goal retrieved' })
    @ApiResponse({ status: 404, description: 'Goal not found' })
    async findOne(@CurrentUser() user: any, @Param('id') id: string) {
        const goal = await this.goalsService.findOne(id, user.sub);
        return { success: true, goal };
    }

    @Put(':id')
    @Roles(Role.THERAPIST)
    @ApiOperation({ summary: 'Update a therapy goal' })
    @ApiResponse({ status: 200, description: 'Goal updated' })
    @ApiResponse({ status: 404, description: 'Goal not found' })
    async update(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() data: any,
    ) {
        const goal = await this.goalsService.update(id, user.sub, data);
        return { success: true, goal };
    }

    @Delete(':id')
    @Roles(Role.THERAPIST)
    @ApiOperation({ summary: 'Delete a therapy goal' })
    @ApiResponse({ status: 200, description: 'Goal deleted' })
    @ApiResponse({ status: 404, description: 'Goal not found' })
    async delete(@CurrentUser() user: any, @Param('id') id: string) {
        await this.goalsService.delete(id, user.sub);
        return { success: true };
    }
}
