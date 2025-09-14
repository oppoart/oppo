import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ScraperModule } from '../scraper/scraper.module';

@Module({
  imports: [PrismaModule, ScraperModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
