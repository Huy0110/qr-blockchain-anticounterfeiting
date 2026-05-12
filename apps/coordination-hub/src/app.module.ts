import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HubLoggerModule } from './observability/logger.module';
import { ObservabilityModule } from './observability/observability.module';
import { MetricsInterceptor } from './observability/metrics.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuthModule } from './auth/auth.module';
import { ProducersModule } from './producers/producers.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ProjectsModule } from './projects/projects.module';
import { ActivitiesModule } from './activities/activities.module';
import { CertificationsModule } from './certifications/certifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { ScanModule } from './scan/scan.module';
import { BatchesModule } from './projects/batches/batches.module';

@Module({
  imports: [
    ConfigModule,
    HubLoggerModule,
    DatabaseModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 600 }]),
    AuthModule,
    ProducersModule,
    BlockchainModule,
    ProjectsModule,
    ActivitiesModule,
    CertificationsModule,
    UploadsModule,
    ScanModule,
    ObservabilityModule,
    BatchesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
