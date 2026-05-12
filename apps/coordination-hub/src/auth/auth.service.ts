import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { Types } from 'mongoose';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import { ProducersService } from '../producers/producers.service';
import { WalletService } from '../blockchain/wallet.service';
import { toProducerProfile, type ProducerProfile } from '../producers/producer.schema';
import {
  AccountLockedException,
  EmailExistsException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from './exceptions';
import type { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

interface AuthEnvelope {
  accessToken: string;
  refreshToken: string;
  producer: ProducerProfile;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly producers: ProducersService,
    private readonly wallet: WalletService,
    private readonly jwt: JwtService,
    @Inject(ENV_TOKEN) private readonly env: Env,
  ) {}

  async register(email: string, password: string): Promise<AuthEnvelope> {
    const existing = await this.producers.findByEmail(email);
    if (existing) throw new EmailExistsException(email);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { walletAddress, encrypted } = this.wallet.generateAndEncrypt();

    const doc = await this.producers.create({
      email,
      passwordHash,
      walletAddress,
      encryptedPrivateKey: encrypted.ciphertext,
      encryptionIV: encrypted.iv,
      encryptionAuthTag: encrypted.authTag,
    });

    return this.buildEnvelope(doc);
  }

  async login(email: string, password: string): Promise<AuthEnvelope> {
    const doc = await this.producers.findByEmail(email);
    if (!doc) throw new InvalidCredentialsException();

    if (doc.lockedUntil && doc.lockedUntil > new Date()) {
      throw new AccountLockedException(doc.lockedUntil);
    }

    const ok = await bcrypt.compare(password, doc.passwordHash);
    if (!ok) {
      const updated = await this.producers.recordFailedLogin(doc._id as unknown as Types.ObjectId);
      if (updated && updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await this.producers.setLockedUntil(updated._id as Types.ObjectId, lockedUntil);
        throw new AccountLockedException(lockedUntil);
      }
      throw new InvalidCredentialsException();
    }

    await this.producers.resetLockout(doc._id as unknown as Types.ObjectId);
    return this.buildEnvelope(doc);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let verified: JwtPayload & { iat?: number; exp?: number };
    try {
      verified = await this.jwt.verifyAsync<JwtPayload & { iat?: number; exp?: number }>(
        refreshToken,
        {
          secret:
            this.env.REFRESH_SECRET ??
            'INSECURE_TEST_REFRESH_SECRET_DO_NOT_USE_IN_PROD_LONGER_THAN_32',
        },
      );
    } catch {
      throw new InvalidRefreshTokenException();
    }
    // Strip iat/exp before re-signing — jsonwebtoken refuses to combine
    // expiresIn option with an existing exp claim.
    const fresh: JwtPayload = {
      producerId: verified.producerId,
      email: verified.email,
      walletAddress: verified.walletAddress,
    };
    return { accessToken: this.signAccess(fresh) };
  }

  private buildEnvelope(doc: { _id: unknown; email: string; walletAddress: string }): AuthEnvelope {
    const payload: JwtPayload = {
      producerId: (doc._id as Types.ObjectId).toHexString(),
      email: doc.email,
      walletAddress: doc.walletAddress,
    };
    return {
      accessToken: this.signAccess(payload),
      refreshToken: this.signRefresh(payload),
      producer: toProducerProfile(doc as Parameters<typeof toProducerProfile>[0]),
    };
  }

  private signAccess(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.env.JWT_SECRET ?? 'INSECURE_TEST_SECRET_DO_NOT_USE_IN_PROD_LONGER_THAN_32',
      expiresIn: this.env.JWT_EXPIRES_IN,
    });
  }

  private signRefresh(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret:
        this.env.REFRESH_SECRET ?? 'INSECURE_TEST_REFRESH_SECRET_DO_NOT_USE_IN_PROD_LONGER_THAN_32',
      expiresIn: this.env.REFRESH_EXPIRES_IN,
    });
  }
}
