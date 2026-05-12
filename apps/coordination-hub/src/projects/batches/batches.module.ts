import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects.module';
import { ProducersModule } from '../../producers/producers.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { ObservabilityModule } from '../../observability/observability.module';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import { QrGeneratorService } from './qr-generator.service';
import { ZipBuilderService } from './zip-builder.service';

@Module({
  imports: [ProjectsModule, ProducersModule, BlockchainModule, ObservabilityModule],
  controllers: [BatchesController],
  providers: [BatchesService, QrGeneratorService, ZipBuilderService],
})
export class BatchesModule {}
