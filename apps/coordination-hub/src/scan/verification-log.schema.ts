import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VerificationOutcomeStatus = 'AUTHENTIC' | 'ALREADY_VERIFIED' | 'COUNTERFEIT';

@Schema({ collection: 'verificationLogs', timestamps: false })
export class VerificationLog {
  @Prop({ type: String, required: true, match: /^0x[a-fA-F0-9]{64}$/, index: true })
  phi!: string;

  @Prop({ type: String, required: true, match: /^0x[a-fA-F0-9]{64}$/ })
  h!: string;

  @Prop({
    type: String,
    enum: ['AUTHENTIC', 'ALREADY_VERIFIED', 'COUNTERFEIT'],
    required: true,
    index: true,
  })
  outcome!: VerificationOutcomeStatus;

  @Prop({ type: String, match: /^0x[a-fA-F0-9]{64}$/ })
  txHash?: string;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  scannedAt!: Date;

  @Prop({ type: String, required: true })
  ipHash!: string;

  @Prop({ type: String, maxlength: 100 })
  userAgentSummary?: string;
}

export type VerificationLogDocument = HydratedDocument<VerificationLog>;
export const VerificationLogSchema = SchemaFactory.createForClass(VerificationLog);
VerificationLogSchema.index({ phi: 1, scannedAt: -1 });
VerificationLogSchema.index({ phi: 1, outcome: 1 });
