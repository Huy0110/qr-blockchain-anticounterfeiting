import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV_TOKEN } from '../../config/config.module';
import type { Env } from '../../config/env.schema';

export interface JwtPayload {
  producerId: string;
  email: string;
  walletAddress: string;
}

export type JwtUser = JwtPayload;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(ENV_TOKEN) env: Env) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_SECRET ?? 'INSECURE_TEST_SECRET_DO_NOT_USE_IN_PROD_LONGER_THAN_32',
      ignoreExpiration: false,
    });
  }

  validate(payload: JwtPayload): JwtUser {
    return {
      producerId: payload.producerId,
      email: payload.email,
      walletAddress: payload.walletAddress,
    };
  }
}
