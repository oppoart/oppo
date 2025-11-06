import { Module } from '@nestjs/common';
import {
  QueryTemplatesController,
  ProfileQueryTemplatesController,
} from './query-templates.controller';
import { QueryTemplatesService } from './query-templates.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [QueryTemplatesController, ProfileQueryTemplatesController],
  providers: [QueryTemplatesService, PrismaService],
  exports: [QueryTemplatesService],
})
export class QueryTemplatesModule {}
