import { Module } from '@nestjs/common';
import { QueryGenerationController } from './query-generation.controller';
import { QueryGenerationService } from './query-generation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../../shared/services/ai.module';

// Component services
import { QueryTemplateEngine } from './templates/template-engine';
import { QueryProcessor } from './processors/query-processor';
import { QueryAiService } from './ai/query-ai.service';

// Strategy services
import { BasicQueryStrategy } from './strategies/basic-strategy';
import { SemanticQueryStrategy } from './strategies/semantic-strategy';
import { TargetedQueryStrategy } from './strategies/targeted-strategy';
import { ExploratoryQueryStrategy } from './strategies/exploratory-strategy';

// Query expansion services
import { CartesianProductService } from './services/cartesian-product.service';
import { PlaceholderReplacementService } from './services/placeholder-replacement.service';
import { QueryExpansionService } from './services/query-expansion.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [QueryGenerationController],
  providers: [
    // Core service
    QueryGenerationService,

    // Component services
    QueryTemplateEngine,
    QueryProcessor,
    QueryAiService,

    // Strategy services
    BasicQueryStrategy,
    SemanticQueryStrategy,
    TargetedQueryStrategy,
    ExploratoryQueryStrategy,

    // Query expansion services
    CartesianProductService,
    PlaceholderReplacementService,
    QueryExpansionService,
  ],
  exports: [
    QueryGenerationService,
    QueryExpansionService,
  ],
})
export class QueryGenerationModule {}