import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TherapyGoal, TherapyGoalDocument, GoalStatus } from './schemas/therapy-goal.schema';

@Injectable()
export class TherapyGoalsService {
    constructor(
        @InjectModel(TherapyGoal.name) private goalModel: Model<TherapyGoalDocument>,
    ) { }

    async create(therapistId: string, data: Partial<TherapyGoal>): Promise<TherapyGoalDocument> {
        const goal = new this.goalModel({
            ...data,
            therapistId: new Types.ObjectId(therapistId),
            patientId: new Types.ObjectId(data.patientId as any),
        });
        return goal.save();
    }

    async findByTherapist(
        therapistId: string,
        params: {
            patientId?: string;
            status?: string;
            page?: number;
            limit?: number;
        } = {},
    ) {
        const { patientId, status, page = 1, limit = 50 } = params;

        const query: any = {
            therapistId: new Types.ObjectId(therapistId),
            deleted: false,
        };

        if (patientId) {
            query.patientId = new Types.ObjectId(patientId);
        }

        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const [goals, total] = await Promise.all([
            this.goalModel
                .find(query)
                .populate('patientId', 'fullName mrn')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .exec(),
            this.goalModel.countDocuments(query),
        ]);

        return {
            goals: goals.map((g) => ({
                id: g._id,
                title: g.title,
                description: g.description,
                category: g.category,
                priority: g.priority,
                status: g.status,
                progress: g.progress,
                targetDate: g.targetDate,
                notes: g.notes,
                milestones: g.milestones,
                patientId: g.patientId._id || g.patientId,
                patientName: (g.patientId as any)?.fullName,
                createdAt: g.createdAt,
                updatedAt: g.updatedAt,
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string, therapistId: string): Promise<TherapyGoalDocument> {
        const goal = await this.goalModel
            .findOne({
                _id: new Types.ObjectId(id),
                therapistId: new Types.ObjectId(therapistId),
                deleted: false,
            })
            .populate('patientId', 'fullName mrn')
            .exec();

        if (!goal) {
            throw new NotFoundException('Goal not found');
        }

        return goal;
    }

    async update(
        id: string,
        therapistId: string,
        data: Partial<TherapyGoal>,
    ): Promise<TherapyGoalDocument> {
        const goal = await this.goalModel.findOne({
            _id: new Types.ObjectId(id),
            therapistId: new Types.ObjectId(therapistId),
            deleted: false,
        });

        if (!goal) {
            throw new NotFoundException('Goal not found');
        }

        // Update fields
        Object.assign(goal, data);

        // Auto-complete if progress reaches 100
        if (goal.progress >= 100 && goal.status !== GoalStatus.COMPLETED) {
            goal.status = GoalStatus.COMPLETED;
        }

        return goal.save();
    }

    async delete(id: string, therapistId: string): Promise<void> {
        const result = await this.goalModel.updateOne(
            {
                _id: new Types.ObjectId(id),
                therapistId: new Types.ObjectId(therapistId),
            },
            { deleted: true },
        );

        if (result.modifiedCount === 0) {
            throw new NotFoundException('Goal not found');
        }
    }

    async findByPatient(patientId: string): Promise<any[]> {
        const goals = await this.goalModel
            .find({
                patientId: new Types.ObjectId(patientId),
                deleted: false,
            })
            .populate('patientId', 'fullName mrn')
            .sort({ priority: -1, createdAt: -1 }) // Sort by priority then date
            .exec();

        return goals.map((g) => ({
            id: g._id,
            title: g.title,
            description: g.description,
            category: g.category,
            priority: g.priority,
            status: g.status,
            progress: g.progress,
            targetDate: g.targetDate,
            notes: g.notes,
            milestones: g.milestones,
            patientId: g.patientId._id || g.patientId,
            patientName: (g.patientId as any)?.fullName,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
        }));
    }

    // Get stats for dashboard
    async getStats(therapistId: string) {
        const [total, active, completed] = await Promise.all([
            this.goalModel.countDocuments({
                therapistId: new Types.ObjectId(therapistId),
                deleted: false,
            }),
            this.goalModel.countDocuments({
                therapistId: new Types.ObjectId(therapistId),
                status: GoalStatus.ACTIVE,
                deleted: false,
            }),
            this.goalModel.countDocuments({
                therapistId: new Types.ObjectId(therapistId),
                status: GoalStatus.COMPLETED,
                deleted: false,
            }),
        ]);

        return { total, active, completed };
    }
}
