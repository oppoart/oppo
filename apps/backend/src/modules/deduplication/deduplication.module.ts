import { Module } from '@nestjs/common';
import { DeduplicationController } from './deduplication.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DeduplicationController],
  providers: [],
  exports: [],
})
export class DeduplicationModule {}