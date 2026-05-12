import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'auditLogs', timestamps: false })
export class AuditLog {
  @Prop({ type: String, required: true, index: true })
  actor!: string;

  @Prop({ type: String, required: true, index: true })
  action!: string;

  @Prop({ type: String, index: true })
  target?: string;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  timestamp!: Date;

  @Prop({ type: String })
  ipHash?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ actor: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
