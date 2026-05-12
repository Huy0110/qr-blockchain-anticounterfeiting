import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Producer, ProducerSchema } from './producer.schema';
import { ProducersService } from './producers.service';
import { ProducersController } from './producers.controller';

/**
 * ProducersModule does NOT import AuthModule even though
 * ProducersController uses JwtAuthGuard. The guard relies on the global
 * Passport context (AppModule imports AuthModule, which registers
 * JwtStrategy) so it works wherever it's applied without each consumer
 * module re-importing AuthModule. Avoiding the import keeps the dep
 * graph acyclic.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Producer.name, schema: ProducerSchema }])],
  controllers: [ProducersController],
  providers: [ProducersService],
  exports: [ProducersService, MongooseModule],
})
export class ProducersModule {}
