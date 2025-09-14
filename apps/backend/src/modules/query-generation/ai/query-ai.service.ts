import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../../shared/services/ai.service';
import { QueryProcessor } from '../processors/query-processor';
import { 
  QueryGenerationContext, 
  GeneratedQuery,
  QueryType
} from '../../../types/query-generation';
import { 
  QUERY_STRATEGIES,
  QUERY_PRIORITIES
} from '../../../constants/query.constants';

@Injectable()
export class QueryAiService {
  private readonly logger = new Logger(QueryAiService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly queryProcessor: QueryProcessor
  ) {}

  async generateAiQueries(
    queryType: QueryType, 
    context: QueryGenerationContext, 
    count: number
  ): Promise<GeneratedQuery[]> {
    const prompt = this.buildAiPrompt(queryType, context, count);
    const response = await this.aiService.generateSearchQueries(prompt);
    
    // Parse AI response and convert to GeneratedQuery objects
    const queryStrings = this.parseAiResponse(response);
    
    return queryStrings.map(queryString => ({
      query: queryString,
      type: queryType,
      strategy: QUERY_STRATEGIES.SEMANTIC,
      priority: QUERY_PRIORITIES.MEDIUM,
      keywords: this.queryProcessor.extractKeywords(queryString, context),
      expectedResults: 25,
      confidence: 0.8,
      context: {
        profileId: context.profile.id,
        mediums: context.profile.mediums,
        interests: context.profile.interests,
        location: context.profile.location,
        careerStage: context.profile.careerStage,
      }
    }));
  }

  private buildAiPrompt(queryType: QueryType, context: QueryGenerationContext, count: number): string {
    const profileSummary = this.buildProfileSummary(context);
    
    return `Generate ${count} diverse search queries to find ${queryType} opportunities for this artist:

${profileSummary}

Requirements:
- Focus specifically on ${queryType} opportunities (grants, residencies, exhibitions, etc.)
- Make queries specific and targeted for web search
- Include relevant keywords from the artist's profile
- Vary the query structure and approach
- Return only the search queries, one per line, no numbering or explanations`;
  }

  private buildProfileSummary(context: QueryGenerationContext): string {
    const parts = [];
    
    parts.push(`Artist: ${context.profile.name}`);
    
    if (context.profile.mediums.length > 0) {
      parts.push(`Art Forms: ${context.profile.mediums.join(', ')}`);
    }
    
    if (context.profile.location) {
      parts.push(`Location: ${context.profile.location}`);
    }
    
    if (context.profile.careerStage) {
      parts.push(`Career Stage: ${context.profile.careerStage}`);
    }
    
    if (context.profile.interests.length > 0) {
      parts.push(`Interests: ${context.profile.interests.join(', ')}`);
    }
    
    return parts.join('\n');
  }

  private parseAiResponse(response: string): string[] {
    return response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.match(/^\d+\./)) // Remove numbered items
      .slice(0, 10); // Limit to 10 queries max
  }
}