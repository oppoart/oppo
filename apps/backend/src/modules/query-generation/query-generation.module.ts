import { Module } from '@nestjs/common';
import { QueryGenerationController } from './query-generation.controller';
import { QueryGenerationService } from './query-generation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../../shared/services/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [QueryGenerationController],
  providers: [QueryGenerationService],
  exports: [QueryGenerationService],
})
export class QueryGenerationModule {}