import { openaiClient } from './OpenAIClient';
import { anthropicClient } from './AnthropicClient';
import { AIResponse } from './OpenAIClient';

export interface AIServiceOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemMessage?: string;
  useAnthropic?: boolean;
}

export class AIService {
  async generateCompletion(
    prompt: string, 
    options: AIServiceOptions = {}
  ): Promise<AIResponse> {
    const { useAnthropic = false, ...restOptions } = options;

    // Only use OpenAI - Anthropic is disabled
    try {
      return await openaiClient.generateCompletion(prompt, restOptions);
    } catch (error) {
      console.error('OpenAI failed (Anthropic disabled):', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return await openaiClient.generateEmbedding(text);
  }

  async healthCheck(): Promise<{
    openai: boolean;
    anthropic: boolean;
  }> {
    const [openaiHealth, anthropicHealth] = await Promise.all([
      openaiClient.healthCheck(),
      anthropicClient.healthCheck()
    ]);

    return {
      openai: openaiHealth,
      anthropic: anthropicHealth
    };
  }

  async generateQueries(
    profile: any,
    opportunityType: 'grants' | 'residencies' | 'exhibitions' | 'all' = 'all',
    temperature?: number
  ): Promise<string[]> {
    const systemMessage = `You are an expert at creating search queries to find art opportunities for artists. 
    Generate 5-10 relevant, diverse search queries that would help find ${opportunityType === 'all' ? 'grants, residencies, exhibitions, and other opportunities' : opportunityType} 
    for the given artist profile. Each query should be specific and actionable.`;

    const prompt = `Artist Profile:
    ${JSON.stringify(profile, null, 2)}

    Generate search queries that would help this artist find relevant opportunities. 
    Return only the queries, one per line, without numbering or bullets.`;

    const response = await this.generateCompletion(prompt, {
      systemMessage,
      temperature: temperature || 0.8,
      maxTokens: 500
    });

    return response.content
      .split('\n')
      .map(query => query.trim())
      .filter(query => query.length > 0)
      .slice(0, 10);
  }

  async analyzeOpportunity(
    opportunity: any,
    profile: any
  ): Promise<{
    relevanceScore: number;
    category: string;
    reasoning: string;
  }> {
    const systemMessage = `You are an expert at analyzing art opportunities for relevance to artist profiles.
    Analyze the opportunity and return a JSON object with:
    - relevanceScore: number between 0 and 1 (1 being perfect match)
    - category: string categorizing the opportunity (grant, residency, exhibition, competition, etc.)
    - reasoning: string explaining the score and fit

    Be precise and analytical in your assessment.`;

    const prompt = `Artist Profile:
    ${JSON.stringify(profile, null, 2)}

    Opportunity:
    ${JSON.stringify(opportunity, null, 2)}

    Analyze this opportunity's relevance to the artist profile.`;

    const response = await this.generateCompletion(prompt, {
      systemMessage,
      temperature: 0.3,
      maxTokens: 400
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        relevanceScore: 0.5,
        category: 'unknown',
        reasoning: 'Failed to parse analysis response'
      };
    }
  }

  async batchAnalyzeOpportunities(
    opportunities: any[],
    profile: any
  ): Promise<Array<{
    opportunityId: string;
    relevanceScore: number;
    category: string;
    reasoning: string;
  }>> {
    const analyses = await Promise.all(
      opportunities.map(async (opportunity) => {
        const analysis = await this.analyzeOpportunity(opportunity, profile);
        return {
          opportunityId: opportunity.id || opportunity._id || 'unknown',
          ...analysis
        };
      })
    );

    return analyses;
  }

  async enhanceSystemPrompt(
    originalPrompt: string,
    profile: any
  ): Promise<string> {
    const systemMessage = `You are an expert AI prompt engineer specializing in creating sophisticated system prompts for artist representation. 
    Your task is to enhance and improve system prompts while maintaining the artist's authentic voice and expanding on their unique characteristics.
    
    Guidelines:
    - Keep the core identity and specializations intact
    - Add more nuanced language and professional terminology
    - Include contextual details that make responses more authentic
    - Enhance the instruction clarity for better AI performance
    - Maintain the artist's unique voice and perspective
    - Add relevant art world knowledge and context`;

    const prompt = `Original System Prompt:
${originalPrompt}

Artist Profile Context:
${JSON.stringify(profile, null, 2)}

Please enhance this system prompt to be more detailed, sophisticated, and effective while maintaining the artist's authentic voice. The enhanced prompt should:
1. Be more specific about the artist's expertise and background
2. Include better instructions for maintaining their voice and perspective  
3. Add contextual art world knowledge relevant to their practice
4. Improve clarity and effectiveness for AI conversations
5. Remain true to the artist's identity and specializations

Return only the enhanced system prompt, no additional commentary.`;

    const response = await this.generateCompletion(prompt, {
      systemMessage,
      temperature: 0.7,
      maxTokens: 800
    });

    return response.content.trim();
  }
}

export const aiService = new AIService();