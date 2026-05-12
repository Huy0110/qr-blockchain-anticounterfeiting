import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsModule } from '../projects/projects.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { VerificationLog, VerificationLogSchema } from './verification-log.schema';
import { VerificationLogService } from './verification-log.service';
import { ScanService } from './scan.service';
import { ScanController } from './scan.controller';
import { VerificationsController } from './verifications.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: VerificationLog.name, schema: VerificationLogSchema }]),
    ProjectsModule,
    BlockchainModule,
  ],
  controllers: [ScanController, VerificationsController],
  providers: [ScanService, VerificationLogService],
  exports: [VerificationLogService],
})
export class ScanModule {}
