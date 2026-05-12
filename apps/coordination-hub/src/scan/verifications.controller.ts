import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Phi } from '@qr-bc/shared';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PhiParamSchema } from '../projects/dto/project.dto';
import { ProjectsService } from '../projects/projects.service';
import { VerificationLogService } from './verification-log.service';

interface JwtRequest extends Request {
  user: { producerId: string; email: string; walletAddress: string };
}

/**
 * Owner-scoped read-only analytics on the verification log. Only the
 * project's owning producer can read its stats — assertOwnership in
 * ProjectsService throws PROJECT_FORBIDDEN otherwise.
 */
@ApiTags('verifications')
@ApiBearerAuth()
@Controller({ path: 'projects/:phi/verifications', version: '1' })
@UseGuards(JwtAuthGuard)
export class VerificationsController {
  constructor(
    private readonly logs: VerificationLogService,
    private readonly projects: ProjectsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Verification analytics for the owning producer' })
  async getStats(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
  ): ReturnType<VerificationLogService['getProjectStats']> {
    // findOwnedByProducer throws PROJECT_FORBIDDEN if producerId
    // doesn't own the project, satisfying AC-MP-7 (server-enforced).
    await this.projects.findOwnedByProducer(req.user.producerId, params.phi as Phi);
    return this.logs.getProjectStats(params.phi);
  }
}
