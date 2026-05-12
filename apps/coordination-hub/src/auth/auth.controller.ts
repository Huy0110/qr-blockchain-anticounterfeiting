import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  LoginDtoSchema,
  RefreshDtoSchema,
  RegisterDtoSchema,
  type LoginDto,
  type RefreshDto,
  type RegisterDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ register: { ttl: 60 * 60 * 1000, limit: 3 } })
  @ApiOperation({ summary: 'Register a new producer + auto-generate wallet' })
  register(@Body(new ZodValidationPipe(RegisterDtoSchema)) dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ login: { ttl: 15 * 60 * 1000, limit: 5 } })
  @ApiOperation({ summary: 'Exchange email + password for access + refresh tokens' })
  login(@Body(new ZodValidationPipe(LoginDtoSchema)) dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mint a new access token from a refresh token' })
  refresh(@Body(new ZodValidationPipe(RefreshDtoSchema)) dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
