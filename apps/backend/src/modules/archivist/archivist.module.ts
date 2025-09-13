import { Module } from '@nestjs/common';
import { ArchivistService } from './archivist.service';
import { ArchivistController } from './archivist.controller';
import { DeduplicationService } from './services/deduplication.service';
import { DataManagementService } from './services/data-management.service';
import { BackupService } from './services/backup.service';

@Module({
  controllers: [ArchivistController],
  providers: [
    ArchivistService,
    DeduplicationService,
    DataManagementService,
    BackupService,
  ],
  exports: [ArchivistService, DeduplicationService, DataManagementService],
})
export class ArchivistModule {}
