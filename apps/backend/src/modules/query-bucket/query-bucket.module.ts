import { Module } from '@nestjs/common';
import { QueryBucketController } from './query-bucket.controller';
import { QueryBucketService } from './query-bucket.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QueryBucketController],
  providers: [QueryBucketService],
  exports: [QueryBucketService],
})
export class QueryBucketModule {}
