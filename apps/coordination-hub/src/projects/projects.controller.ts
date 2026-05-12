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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Phi } from '@qr-bc/shared';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateProjectDtoSchema,
  ListProjectsQuerySchema,
  PhiParamSchema,
  UpdateProjectDtoSchema,
  type CreateProjectDto,
  type ListProjectsQuery,
  type UpdateProjectDto,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';
import { toProjectMetadata } from './project.schema';

interface JwtRequest extends Request {
  user: { producerId: string; email: string; walletAddress: string };
}

@ApiTags('projects')
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a project + register phi on-chain' })
  async create(
    @Req() req: JwtRequest,
    @Body(new ZodValidationPipe(CreateProjectDtoSchema)) dto: CreateProjectDto,
  ) {
    const doc = await this.projects.create(req.user.producerId, dto);
    return toProjectMetadata(doc);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List projects owned by the authenticated producer' })
  async list(
    @Req() req: JwtRequest,
    @Query(new ZodValidationPipe(ListProjectsQuerySchema)) query: ListProjectsQuery,
  ) {
    const result = await this.projects.list(req.user.producerId, query);
    return {
      items: result.items.map((d) => toProjectMetadata(d)),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get(':phi')
  @ApiOperation({ summary: 'Public read of a project (status ∈ {harvesting, finished})' })
  async findPublic(@Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string }) {
    const doc = await this.projects.findPublic(params.phi as Phi);
    return toProjectMetadata(doc);
  }

  @Patch(':phi')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an owned project (PATCH semantics)' })
  async update(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
    @Body(new ZodValidationPipe(UpdateProjectDtoSchema)) dto: UpdateProjectDto,
  ) {
    const doc = await this.projects.update(req.user.producerId, params.phi as Phi, dto);
    return toProjectMetadata(doc);
  }

  @Delete(':phi')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an owned project' })
  async softDelete(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
  ): Promise<void> {
    await this.projects.softDelete(req.user.producerId, params.phi as Phi);
  }
}
