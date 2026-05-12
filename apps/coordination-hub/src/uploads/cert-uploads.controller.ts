import {
  Controller,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type {} from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
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

/**
 * Single-file PDF upload sink for certifications. Lives in its own
 * controller so it can use FileInterceptor (one file) instead of the
 * FilesInterceptor (multi-file) that powers /images. Returns the
 * pinned IPFS URL so the management portal can store it on the
 * certification record's documentUrl field.
 */
@ApiTags('uploads')
@ApiBearerAuth()
@Controller({ path: 'projects/:phi/uploads', version: '1' })
@UseGuards(JwtAuthGuard)
export class CertUploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly projects: ProjectsService,
  ) {}

  @Post('cert')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Pin one PDF certification (≤10 MB) to IPFS' })
  async upload(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<{ url: string }> {
    const phi = params.phi as Phi;
    // Ownership check (AC-MP-7) — even though the cert metadata is
    // saved separately by /certifications, the upload itself must be
    // scoped to a project the producer owns.
    await this.projects.findOwnedByProducer(req.user.producerId, phi);
    if (!file) {
      throw new Error('file is required');
    }
    const result = await this.uploads.pinPdf(file.buffer, file.originalname);
    return { url: result.url };
  }
}
