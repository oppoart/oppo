import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartesianProductService, ParameterSet } from './cartesian-product.service';
import { PlaceholderReplacementService } from './placeholder-replacement.service';
import {
  ExpandedQuery,
  ExpansionStats,
  QueryExpansionOptions,
  QueryExpansionResponse,
  QueryExpansionError,
  TemplateUsage,
} from '../../../types/query-expansion';

@Injectable()
export class QueryExpansionService {
  private readonly logger = new Logger(QueryExpansionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartesian: CartesianProductService,
    private readonly placeholder: PlaceholderReplacementService
  ) {}

  /**
   * Expand all queries for a profile based on its parameters
   */
  async expandQueriesForProfile(
    profileId: string,
    options?: Partial<QueryExpansionOptions>
  ): Promise<QueryExpansionResponse> {
    try {
      // 1. Get profile with parameters
      const profile = await this.prisma.artistProfile.findUnique({
        where: { id: profileId },
        select: {
          id: true,
          name: true,
          mediums: true,
          locations: true,
          opportunityTypes: true,
          amountRanges: true,
          themes: true,
        },
      });

      if (!profile) {
        throw new NotFoundException(`Profile with ID ${profileId} not found`);
      }

      // 2. Get all templates from database
      const groups = await this.prisma.queryTemplateGroup.findMany({
        where: options?.groupId ? { id: options.groupId } : undefined,
        include: {
          templates: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      });

      // 3. Generate parameter combinations
      const parameters: ParameterSet = {
        locations: profile.locations,
        opportunityTypes: profile.opportunityTypes,
        amountRanges: profile.amountRanges,
        themes: profile.themes,
      };

      const combinations = this.cartesian.generateCombinations(parameters);
      const autoValues = this.placeholder.generateAutoValues(profile);

      // 4. Expand queries
      const expandedQueries: ExpandedQuery[] = [];
      const templateUsage: TemplateUsage[] = [];
      const queriesByGroup: Record<string, number> = {};

      for (const group of groups) {
        queriesByGroup[group.name] = 0;

        for (const template of group.templates) {
          const requiredPlaceholders = this.placeholder.extractPlaceholders(
            template.template
          );
          const categorized = this.placeholder.categorizePlaceholders(
            requiredPlaceholders
          );

          // If template has no user placeholders, generate one query with auto values
          if (categorized.user.length === 0) {
            const expanded = this.placeholder.replace(
              template.template,
              {},
              autoValues
            );

            expandedQueries.push({
              id: `${template.id}-auto`,
              templateId: template.id,
              template: template.template,
              expanded,
              groupId: group.id,
              groupName: group.name,
              placeholders: autoValues as Record<string, string | number>,
              createdAt: new Date(),
            });

            queriesByGroup[group.name]++;

            templateUsage.push({
              templateId: template.id,
              template: template.template,
              groupName: group.name,
              used: true,
              requiredPlaceholders,
              missingPlaceholders: [],
              possibleCombinations: 1,
            });

            continue;
          }

          // Check if we have combinations for this template
          if (combinations.length === 0) {
            templateUsage.push({
              templateId: template.id,
              template: template.template,
              groupName: group.name,
              used: false,
              skippedReason: 'No parameter combinations available',
              requiredPlaceholders,
              missingPlaceholders: categorized.user,
              possibleCombinations: 0,
            });
            continue;
          }

          // Generate queries for each combination
          let usedForTemplate = false;
          for (const combo of combinations) {
            // Check if combination has all required user placeholders
            const missing = this.placeholder.getMissingPlaceholders(
              template.template,
              { ...combo, ...autoValues }
            );

            if (missing.length > 0) {
              if (!options?.includeIncomplete) {
                continue; // Skip incomplete combinations
              }
            }

            const expanded = this.placeholder.replace(
              template.template,
              combo,
              autoValues
            );

            // Avoid duplicates
            if (!expandedQueries.some(q => q.expanded === expanded)) {
              expandedQueries.push({
                id: `${template.id}-${Object.values(combo).join('-')}`,
                templateId: template.id,
                template: template.template,
                expanded,
                groupId: group.id,
                groupName: group.name,
                placeholders: { ...combo, ...autoValues } as Record<string, string | number>,
                createdAt: new Date(),
              });

              queriesByGroup[group.name]++;
              usedForTemplate = true;
            }
          }

          templateUsage.push({
            templateId: template.id,
            template: template.template,
            groupName: group.name,
            used: usedForTemplate,
            skippedReason: usedForTemplate
              ? undefined
              : 'No matching parameter combinations',
            requiredPlaceholders,
            missingPlaceholders: usedForTemplate ? [] : categorized.user,
            possibleCombinations: combinations.length,
          });
        }
      }

      // 5. Calculate stats
      const parameterStats = this.cartesian.getParameterStats(parameters);
      const stats: ExpansionStats = {
        totalTemplates: groups.reduce(
          (acc, g) => acc + g.templates.length,
          0
        ),
        totalCombinations: combinations.length,
        totalQueries: expandedQueries.length,
        queriesByGroup,
        parametersUsed: parameterStats.emptyParameters.length === 4
          ? []
          : Object.keys(parameters).filter(
              key => parameters[key] && parameters[key]!.length > 0
            ),
        emptyParameters: parameterStats.emptyParameters,
        coverageScore: Math.round(
          (parameterStats.filledParameters / parameterStats.totalParameters) *
            100
        ),
      };

      // 6. Apply limit
      const limitedQueries = options?.limit
        ? expandedQueries.slice(0, options.limit)
        : expandedQueries;

      // 7. Build response
      return {
        success: true,
        message: `Generated ${limitedQueries.length} expanded queries from ${stats.totalTemplates} templates`,
        data: {
          profileId,
          totalQueries: limitedQueries.length,
          queries: limitedQueries,
          stats,
          templatesCoverage: {
            used: templateUsage.filter(t => t.used).length,
            skipped: templateUsage.filter(t => !t.used).length,
            reasons: this.groupSkippedTemplates(templateUsage),
          },
        },
      };
    } catch (error) {
      this.logger.error('Query expansion failed', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new QueryExpansionError(
        `Query expansion failed: ${error.message}`,
        'EXPANSION_FAILED',
        { profileId, error: error.message }
      );
    }
  }

  /**
   * Get a preview of how many queries would be generated
   */
  async getExpansionPreview(profileId: string): Promise<{
    totalTemplates: number;
    totalCombinations: number;
    estimatedQueries: number;
    parameterBreakdown: Record<string, number>;
  }> {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: profileId },
      select: {
        locations: true,
        opportunityTypes: true,
        amountRanges: true,
        themes: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    const templates = await this.prisma.queryTemplate.count();

    const parameters: ParameterSet = {
      locations: profile.locations,
      opportunityTypes: profile.opportunityTypes,
      amountRanges: profile.amountRanges,
      themes: profile.themes,
    };

    const combinationCount = this.cartesian.calculateCombinationCount(
      parameters
    );

    return {
      totalTemplates: templates,
      totalCombinations: combinationCount,
      estimatedQueries: templates * Math.max(1, combinationCount),
      parameterBreakdown: {
        locations: profile.locations.length,
        opportunityTypes: profile.opportunityTypes.length,
        amountRanges: profile.amountRanges.length,
        themes: profile.themes.length,
      },
    };
  }

  /**
   * Group skipped templates by reason
   */
  private groupSkippedTemplates(
    usage: TemplateUsage[]
  ): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};

    usage
      .filter(t => !t.used && t.skippedReason)
      .forEach(t => {
        const reason = t.skippedReason!;
        if (!grouped[reason]) {
          grouped[reason] = [];
        }
        grouped[reason].push(t.templateId);
      });

    return grouped;
  }
}
