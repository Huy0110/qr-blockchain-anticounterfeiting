import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

export type AuditAction =
  | 'PROJECT_CREATE'
  | 'PROJECT_UPDATE'
  | 'PROJECT_DELETE'
  | 'BATCH_REGISTER'
  | 'PRODUCT_REDEEM'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'REGISTER_SUCCESS';

@Injectable()
export class AuditLogService {
  constructor(@InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>) {}

  async record(input: {
    actor: string;
    action: AuditAction;
    target?: string;
    ipHash?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.model.create({
      actor: input.actor,
      action: input.action,
      ...(input.target ? { target: input.target } : {}),
      timestamp: new Date(),
      ...(input.ipHash ? { ipHash: input.ipHash } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
  }

  async listByActor(actor: string, limit = 50): Promise<AuditLogDocument[]> {
    return this.model.find({ actor }).sort({ timestamp: -1 }).limit(limit).exec();
  }
}
