import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { ProducerDocument } from './producer.schema';
import { Producer } from './producer.schema';

@Injectable()
export class ProducersService {
  constructor(
    @InjectModel(Producer.name) private readonly producerModel: Model<ProducerDocument>,
  ) {}

  async findById(id: string): Promise<ProducerDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Producer not found');
    const doc = await this.producerModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Producer not found');
    return doc;
  }

  findByEmail(email: string): Promise<ProducerDocument | null> {
    return this.producerModel.findOne({ email: email.toLowerCase() }).exec();
  }

  create(input: {
    email: string;
    passwordHash: string;
    walletAddress: string;
    encryptedPrivateKey: string;
    encryptionIV: string;
    encryptionAuthTag: string;
  }): Promise<ProducerDocument> {
    return this.producerModel.create(input);
  }

  /** Atomic counter increment + lock-on-threshold. Returns the post-update doc. */
  async recordFailedLogin(producerId: Types.ObjectId): Promise<ProducerDocument | null> {
    return this.producerModel
      .findByIdAndUpdate(
        producerId,
        {
          $inc: { failedLoginAttempts: 1 },
          $set: { lastFailedLoginAt: new Date() },
        },
        { new: true },
      )
      .exec();
  }

  async setLockedUntil(producerId: Types.ObjectId, lockedUntil: Date): Promise<void> {
    await this.producerModel.findByIdAndUpdate(producerId, { $set: { lockedUntil } }).exec();
  }

  async resetLockout(producerId: Types.ObjectId): Promise<void> {
    await this.producerModel
      .findByIdAndUpdate(producerId, {
        $set: { failedLoginAttempts: 0 },
        $unset: { lastFailedLoginAt: '', lockedUntil: '' },
      })
      .exec();
  }
}
