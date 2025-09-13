import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { AiService } from '../../shared/services/ai.service';
import { QueryGenerationModule } from '../query-generation/query-generation.module';

@Module({
  imports: [QueryGenerationModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, AiService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
