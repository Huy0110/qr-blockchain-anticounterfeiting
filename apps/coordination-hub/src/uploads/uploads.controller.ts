import {
  Controller,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
// @types/multer side-effect import for the global Express.Multer.File type.
import type {} from 'multer';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Phi } from '@qr-bc/shared';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PhiParamSchema } from '../projects/dto/project.dto';
import { ProjectsService } from '../projects/projects.service';
import { UploadsService } from './uploads.service';

interface JwtRequest extends Request {
  user: { producerId: string; email: string; walletAddress: string };
}

const MAX_FILES = 10;

@ApiTags('uploads')
@ApiBearerAuth()
@Controller({ path: 'projects/:phi/images', version: '1' })
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly projects: ProjectsService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', MAX_FILES))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Pin up to 10 images (≤10 MB each) to IPFS' })
  async upload(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ urls: string[] }> {
    const phi = params.phi as Phi;
    const project = await this.projects.findOwnedByProducer(req.user.producerId, phi);

    const results = await Promise.all(
      (files ?? []).map((f) => this.uploads.pinImage(f.buffer, f.originalname)),
    );
    project.imageUrls.push(...results.map((r) => r.url));
    await project.save();
    return { urls: results.map((r) => r.url) };
  }
}
