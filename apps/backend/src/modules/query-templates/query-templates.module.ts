import { Module } from '@nestjs/common';
import { QueryTemplatesController, UserQueryTemplatesController } from './query-templates.controller';
import { QueryTemplatesService } from './query-templates.service';
import { PrismaService } from '../../services/prisma.service';

@Module({
  controllers: [QueryTemplatesController, UserQueryTemplatesController],
  providers: [QueryTemplatesService, PrismaService],
  exports: [QueryTemplatesService],
})
export class QueryTemplatesModule {}
