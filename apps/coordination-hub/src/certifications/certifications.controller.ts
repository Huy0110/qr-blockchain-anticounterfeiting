import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Phi } from '@qr-bc/shared';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PhiParamSchema } from '../projects/dto/project.dto';
import { CertificationsService } from './certifications.service';
import {
  CreateCertificationDtoSchema,
  UpdateCertificationDtoSchema,
  type CreateCertificationDto,
  type UpdateCertificationDto,
} from './dto/certification.dto';

interface JwtRequest extends Request {
  user: { producerId: string; email: string; walletAddress: string };
}

@ApiTags('certifications')
@ApiBearerAuth()
@Controller({ path: 'projects/:phi/certifications', version: '1' })
@UseGuards(JwtAuthGuard)
export class CertificationsController {
  constructor(private readonly certs: CertificationsService) {}

  @Get()
  list(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
  ) {
    return this.certs.list(req.user.producerId, params.phi as Phi);
  }

  @Post()
  @ApiOperation({ summary: 'Attach a certification (PDF upload pinned in T-018)' })
  add(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
    @Body(new ZodValidationPipe(CreateCertificationDtoSchema)) dto: CreateCertificationDto,
  ): Promise<{ id: string }> {
    return this.certs.add(req.user.producerId, params.phi as Phi, dto);
  }

  @Patch(':certId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
    @Param('certId') certId: string,
    @Body(new ZodValidationPipe(UpdateCertificationDtoSchema)) dto: UpdateCertificationDto,
  ): Promise<void> {
    await this.certs.update(req.user.producerId, params.phi as Phi, certId, dto);
  }

  @Delete(':certId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
    @Param('certId') certId: string,
  ): Promise<void> {
    await this.certs.remove(req.user.producerId, params.phi as Phi, certId);
  }
}
