import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { Phi } from '@qr-bc/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PhiParamSchema } from '../projects/dto/project.dto';
import { ScanService } from './scan.service';
import { ScanPrivateDtoSchema, type ScanPrivateDto } from './dto/scan.dto';

function ipOf(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const xff = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return xff?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
}

@ApiTags('scan')
@Controller({ path: 'scan', version: '1' })
export class ScanController {
  constructor(private readonly scan: ScanService) {}

  @Get('public/:phi')
  @ApiOperation({ summary: 'Public project scan (Algorithm 2)' })
  publicScan(
    @Req() req: Request,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
  ) {
    return this.scan.publicScan(params.phi as Phi, {
      ip: ipOf(req),
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('private')
  @HttpCode(HttpStatus.OK)
  @Throttle({ scanPrivate: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Private product scan (Algorithm 3 phases 1-3)' })
  privateScan(
    @Req() req: Request,
    @Body(new ZodValidationPipe(ScanPrivateDtoSchema)) dto: ScanPrivateDto,
  ) {
    return this.scan.privateScan(dto, {
      ip: ipOf(req),
      userAgent: req.headers['user-agent'],
    });
  }
}
