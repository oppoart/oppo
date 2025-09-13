import { Module } from '@nestjs/common';
import { SentinelService } from './sentinel.service';
import { SentinelController } from './sentinel.controller';
import { ScrapingService } from './services/scraping.service';
import { SourceManagementService } from './services/source-management.service';
import { PlaybookService } from './services/playbook.service';

@Module({
  controllers: [SentinelController],
  providers: [
    SentinelService,
    ScrapingService,
    SourceManagementService,
    PlaybookService,
  ],
  exports: [SentinelService, ScrapingService, SourceManagementService],
})
export class SentinelModule {}
