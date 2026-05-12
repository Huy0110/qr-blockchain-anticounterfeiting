import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument, Types } from 'mongoose';

/**
 * Producer schema per docs/architecture/database.md §3.1.
 *
 * Wallet at-rest encryption: privateKey is AES-256-GCM-encrypted at
 * registration time. The plaintext key never lives on disk; in-memory
 * decryption via WalletService is short-lived and the buffer is zeroed
 * after signing (verified by test/unit/wallet.service.spec.ts).
 */
@Schema({ timestamps: true, collection: 'producers' })
export class Producer {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ type: String, required: true })
  passwordHash!: string;

  @Prop({
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    unique: true,
    index: true,
  })
  walletAddress!: string;

  @Prop({ type: String, required: true })
  encryptedPrivateKey!: string;

  @Prop({ type: String, required: true })
  encryptionIV!: string;

  @Prop({ type: String, required: true })
  encryptionAuthTag!: string;

  @Prop({ type: Number, default: 0 })
  failedLoginAttempts!: number;

  @Prop({ type: Date })
  lastFailedLoginAt?: Date;

  @Prop({ type: Date })
  lockedUntil?: Date;
}

export type ProducerDocument = HydratedDocument<Producer>;
export const ProducerSchema = SchemaFactory.createForClass(Producer);
// @Prop({ unique: true, index: true }) above already declares the indexes;
// adding ProducerSchema.index() here too produces a duplicate-index warning.

export interface ProducerProfile {
  id: string;
  email: string;
  walletAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toProducerProfile(doc: ProducerDocument): ProducerProfile {
  return {
    id: (doc._id as Types.ObjectId).toHexString(),
    email: doc.email,
    walletAddress: doc.walletAddress,
    createdAt: doc.get('createdAt'),
    updatedAt: doc.get('updatedAt'),
  };
}
