import { Module } from '@nestjs/common';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { SearchModule } from '../search/search.module';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
  imports: [SearchModule, AnalysisModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
