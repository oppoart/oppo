import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { UsersModule } from './modules/users/users.module';

// Service modules (Five core modules)
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { SentinelModule } from './modules/sentinel/sentinel.module';
import { AnalystModule } from './modules/analyst/analyst.module';
import { ArchivistModule } from './modules/archivist/archivist.module';
import { LiaisonModule } from './modules/liaison/liaison.module';

// Feature modules
import { SearchModule } from './modules/search/search.module';
import { ResearchModule } from './modules/research/research.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { QueryBucketModule } from './modules/query-bucket/query-bucket.module';
import { QueryGenerationModule } from './modules/query-generation/query-generation.module';
import { DeduplicationModule } from './modules/deduplication/deduplication.module';

// Shared modules
import { PrismaModule } from './modules/prisma/prisma.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

// Configuration
import { validateEnvironment } from './config/env.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: '.env',
    }),

    // Scheduling for automation
    ScheduleModule.forRoot(),

    // Event-driven architecture
    EventEmitterModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'auth',
        ttl: 900000, // 15 minutes
        limit: 5, // 5 auth attempts per 15 minutes
      },
    ]),

    // Shared modules
    PrismaModule,
    WebSocketModule,

    // Core modules
    AuthModule,
    ProfilesModule,
    UsersModule,

    // The Five Core Service Modules
    OrchestratorModule,
    SentinelModule,
    AnalystModule,
    ArchivistModule,
    LiaisonModule,

    // Feature modules
    SearchModule,
    ResearchModule,
    AnalysisModule,
    ScraperModule,
    QueryBucketModule,
    QueryGenerationModule,
    DeduplicationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
