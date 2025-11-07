import { Injectable } from '@nestjs/common';
import { QueryStrategy } from './query-strategy.interface';
import { QueryTemplateEngine } from '../templates/template-engine';
import { QueryProcessor } from '../processors/query-processor';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QueryGenerationRequest,
  QueryGenerationContext,
  GeneratedQuery,
  QueryType
} from '../../../types/query-generation';
import {
  QUERY_STRATEGIES,
  QUERY_PRIORITIES,
  QUERY_GENERATION_DEFAULTS
} from '../../../constants/query.constants';

@Injectable()
export class BasicQueryStrategy implements QueryStrategy {

  constructor(
    private readonly templateEngine: QueryTemplateEngine,
    private readonly queryProcessor: QueryProcessor,
    private readonly prismaService: PrismaService
  ) {}

  async generate(
    request: QueryGenerationRequest,
    context: QueryGenerationContext,
    queryTypes: QueryType[]
  ): Promise<GeneratedQuery[]> {
    const queries: GeneratedQuery[] = [];

    // Get all templates from database
    const groups = await this.prismaService.queryTemplateGroup.findMany({
      include: {
        templates: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Flatten templates
    const allTemplates = groups.flatMap(group =>
      group.templates.map(t => ({
        ...t,
        groupName: group.name,
      }))
    );

    const queriesPerType = Math.max(1, Math.floor(QUERY_GENERATION_DEFAULTS.MAX_QUERIES_PER_TYPE / allTemplates.length));

    for (const template of allTemplates) {
      if (queries.length >= queriesPerType) break;

      const query = this.templateEngine.populateTemplate(template.template, context, request);

      if (query && !queries.some(q => q.query === query)) {
        queries.push({
          query,
          type: 'custom' as QueryType,
          strategy: QUERY_STRATEGIES.BASIC,
          priority: QUERY_PRIORITIES.MEDIUM,
          keywords: this.queryProcessor.extractKeywords(query, context),
          expectedResults: 20,
          confidence: 0.7,
          context: {
            profileId: context.profile.id,
            mediums: context.profile.mediums,
            interests: context.profile.interests,
            location: context.profile.location,
            careerStage: context.profile.careerStage,
          },
          templateId: template.id,
          groupName: template.groupName,
        });
      }
    }

    return queries;
  }
}