import { Module } from '@nestjs/common';
import { AnalystService } from './analyst.service';
import { AnalystController } from './analyst.controller';
import { RelevanceScoringService } from './services/relevance-scoring.service';
import { QueryGenerationService } from './services/query-generation.service';
import { SemanticAnalysisService } from './services/semantic-analysis.service';

@Module({
  controllers: [AnalystController],
  providers: [
    AnalystService,
    RelevanceScoringService,
    QueryGenerationService,
    SemanticAnalysisService,
  ],
  exports: [AnalystService, RelevanceScoringService, QueryGenerationService],
})
export class AnalystModule {}
