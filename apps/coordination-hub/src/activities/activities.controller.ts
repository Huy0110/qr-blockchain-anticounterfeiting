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
import { ActivitiesService } from './activities.service';
import {
  CreateActivityDtoSchema,
  UpdateActivityDtoSchema,
  type CreateActivityDto,
  type UpdateActivityDto,
} from './dto/cultivation-activity.dto';

interface JwtRequest extends Request {
  user: { producerId: string; email: string; walletAddress: string };
}

@ApiTags('activities')
@ApiBearerAuth()
@Controller({ path: 'projects/:phi/activities', version: '1' })
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List cultivation activities on an owned project' })
  list(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
  ) {
    return this.activities.list(req.user.producerId, params.phi as Phi);
  }

  @Post()
  @ApiOperation({ summary: 'Add a cultivation activity to an owned project' })
  add(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
    @Body(new ZodValidationPipe(CreateActivityDtoSchema)) dto: CreateActivityDto,
  ): Promise<{ id: string }> {
    return this.activities.add(req.user.producerId, params.phi as Phi, dto);
  }

  @Patch(':activityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a cultivation activity' })
  async update(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
    @Param('activityId') activityId: string,
    @Body(new ZodValidationPipe(UpdateActivityDtoSchema)) dto: UpdateActivityDto,
  ): Promise<void> {
    await this.activities.update(req.user.producerId, params.phi as Phi, activityId, dto);
  }

  @Delete(':activityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a cultivation activity' })
  async remove(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
    @Param('activityId') activityId: string,
  ): Promise<void> {
    await this.activities.remove(req.user.producerId, params.phi as Phi, activityId);
  }
}
