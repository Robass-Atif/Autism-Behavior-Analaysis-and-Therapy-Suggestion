import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TherapyGoalDocument = TherapyGoal & Document;

export enum GoalStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    ACHIEVED = 'achieved',
    ON_HOLD = 'on hold',
    ARCHIVED = 'archived',
    DISCONTINUED = 'discontinued',
}

export enum GoalPriority {
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low',
}

export enum GoalCategory {
    COMMUNICATION = 'Communication',
    SOCIAL_SKILLS = 'Social Skills',
    BEHAVIOR = 'Behavior',
    MOTOR_SKILLS = 'Motor Skills',
    DAILY_LIVING = 'Daily Living',
    ACADEMIC = 'Academic',
    OTHER = 'Other',
}

@Schema({ timestamps: true })
export class TherapyGoal {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ type: String, enum: GoalCategory, default: GoalCategory.OTHER })
    category: GoalCategory;

    @Prop({ type: String, enum: GoalPriority, default: GoalPriority.MEDIUM })
    priority: GoalPriority;

    @Prop({ type: String, enum: GoalStatus, default: GoalStatus.ACTIVE })
    status: GoalStatus;

    @Prop({ type: Number, default: 0, min: 0, max: 100 })
    progress: number;

    @Prop({ type: Date })
    startDate: Date;

    @Prop({ type: Date })
    targetDate: Date;

    @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
    patientId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Therapist', required: true })
    therapistId: Types.ObjectId;

    @Prop()
    notes: string;

    @Prop({ type: [String], default: [] })
    milestones: string[];

    @Prop({ default: false })
    deleted: boolean;

    createdAt: Date;
    updatedAt: Date;
}

export const TherapyGoalSchema = SchemaFactory.createForClass(TherapyGoal);

// Indexes for efficient queries
TherapyGoalSchema.index({ therapistId: 1, deleted: 1 });
TherapyGoalSchema.index({ patientId: 1, deleted: 1 });
TherapyGoalSchema.index({ status: 1 });
