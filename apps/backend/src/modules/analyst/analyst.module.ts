import { Module } from '@nestjs/common';
import { AnalystService } from './analyst.service';
import { AnalystController } from './analyst.controller';
import { RelevanceScoringService } from './services/relevance-scoring.service';
import { QueryGenerationService as AnalystQueryGenerationService } from './services/query-generation.service';
import { SemanticAnalysisService } from './services/semantic-analysis.service';
import { QueryGenerationModule } from '../query-generation/query-generation.module';

@Module({
  imports: [QueryGenerationModule],
  controllers: [AnalystController],
  providers: [
    AnalystService,
    RelevanceScoringService,
    AnalystQueryGenerationService,
    SemanticAnalysisService,
  ],
  exports: [AnalystService, RelevanceScoringService, AnalystQueryGenerationService],
})
export class AnalystModule {}
