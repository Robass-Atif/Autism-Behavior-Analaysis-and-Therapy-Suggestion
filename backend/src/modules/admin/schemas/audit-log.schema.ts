import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
    @Prop({ required: true })
    action: string;

    @Prop({ required: true })
    userId: string; // Admin ID

    @Prop({ required: false })
    userName?: string; // Admin Name (cached)

    @Prop({ required: true })
    targetUserId: string;

    @Prop({ required: true })
    details: string;

    @Prop({ required: false })
    ipAddress?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
