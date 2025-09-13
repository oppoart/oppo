import { Module } from '@nestjs/common';
import { QueryBucketController } from './query-bucket.controller';
import { QueryBucketService } from './query-bucket.service';

@Module({
  controllers: [QueryBucketController],
  providers: [QueryBucketService],
})
export class QueryBucketModule {}
