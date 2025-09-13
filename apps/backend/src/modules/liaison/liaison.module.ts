import { Module } from '@nestjs/common';
import { LiaisonService } from './liaison.service';
import { LiaisonController } from './liaison.controller';
import { NotionSyncService } from './services/notion-sync.service';
import { ExportService } from './services/export.service';
import { FeedbackService } from './services/feedback.service';

@Module({
  controllers: [LiaisonController],
  providers: [
    LiaisonService,
    NotionSyncService,
    ExportService,
    FeedbackService,
  ],
  exports: [LiaisonService, NotionSyncService, ExportService],
})
export class LiaisonModule {}
