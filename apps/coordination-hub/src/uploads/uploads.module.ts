import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import { IpfsAdapter } from './ipfs-adapter.interface';
import { MockIpfsAdapter } from './mock.adapter';
import { KuboIpfsAdapter } from './kubo.adapter';
import { PinataIpfsAdapter } from './pinata.adapter';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { CertUploadsController } from './cert-uploads.controller';

const ipfsAdapterProvider = {
  provide: IpfsAdapter,
  inject: [ENV_TOKEN, MockIpfsAdapter, KuboIpfsAdapter, PinataIpfsAdapter],
  useFactory: (
    env: Env,
    mock: MockIpfsAdapter,
    kubo: KuboIpfsAdapter,
    pinata: PinataIpfsAdapter,
  ): IpfsAdapter => {
    switch (env.IPFS_PROVIDER) {
      case 'pinata':
        return pinata;
      case 'local':
        return kubo;
      case 'mock':
      default:
        return mock;
    }
  },
};

@Module({
  imports: [ProjectsModule],
  controllers: [UploadsController, CertUploadsController],
  providers: [
    MockIpfsAdapter,
    KuboIpfsAdapter,
    PinataIpfsAdapter,
    ipfsAdapterProvider,
    UploadsService,
  ],
  exports: [UploadsService, IpfsAdapter],
})
export class UploadsModule {}
