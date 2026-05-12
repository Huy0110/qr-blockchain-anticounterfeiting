import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ProducersService } from './producers.service';
import { toProducerProfile, type ProducerProfile } from './producer.schema';

interface JwtRequest extends Request {
  user: { producerId: string; email: string; walletAddress: string };
}

@ApiTags('producers')
@ApiBearerAuth()
@Controller({ path: 'producers', version: '1' })
@UseGuards(JwtAuthGuard)
export class ProducersController {
  constructor(private readonly producers: ProducersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated producer profile' })
  async me(@Req() req: JwtRequest): Promise<ProducerProfile> {
    const doc = await this.producers.findById(req.user.producerId);
    return toProducerProfile(doc);
  }
}
