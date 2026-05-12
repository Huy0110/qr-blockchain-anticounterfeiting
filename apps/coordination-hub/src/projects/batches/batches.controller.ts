import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Phi } from '@qr-bc/shared';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PhiParamSchema } from '../dto/project.dto';
import { BatchesService } from './batches.service';
import { CreateBatchDtoSchema, type CreateBatchDto } from './dto/batch.dto';

interface JwtRequest extends Request {
  user: { producerId: string; email: string; walletAddress: string };
}

@ApiTags('batches')
@ApiBearerAuth()
@Controller({ path: 'projects/:phi/batches', version: '1' })
@UseGuards(JwtAuthGuard)
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate N (sid, h) pairs, register on-chain, return ZIP of QR PNGs',
  })
  async create(
    @Req() req: JwtRequest,
    @Param(new ZodValidationPipe(PhiParamSchema)) params: { phi: string },
    @Body(new ZodValidationPipe(CreateBatchDtoSchema)) dto: CreateBatchDto,
    @Res() res: Response,
  ): Promise<void> {
    const { zipBuffer } = await this.batches.generate(
      req.user.producerId,
      params.phi as Phi,
      dto.n,
      dto.dappBaseUrl,
    );
    const filename = `batch-${params.phi.slice(0, 10)}.zip`;
    res
      .status(HttpStatus.OK)
      .set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length.toString(),
      })
      .end(zipBuffer);
  }

  @Get()
  @ApiOperation({ summary: 'Stub list endpoint — batch metadata is on-chain only in v1' })
  list(): { items: never[]; note: string } {
    return {
      items: [],
      note: 'Batch metadata is recorded on-chain (registerBatch tx + ProductsRegistered event). Query Polygonscan or the audit log for history.',
    };
  }
}
