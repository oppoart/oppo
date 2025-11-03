import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    
    if (apiKey && apiKey !== 'sk-placeholder-key-for-development-testing-only') {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn('OpenAI API key not configured - AI features will return mock responses');
    }
  }

  async enhancePrompt(prompt: string, context?: string): Promise<string> {
    if (!this.openai) {
      this.logger.warn('OpenAI not configured - returning enhanced mock response');
      return this.getMockEnhancement(prompt);
    }

    try {
      const systemMessage = `You are an AI assistant specialized in enhancing prompts for artists seeking opportunities. Your role is to:
1. Improve clarity and specificity
2. Add relevant keywords that would help in searches
3. Maintain the original intent and meaning
4. Make the prompt more compelling and professional
5. Ensure it's optimized for finding grants, residencies, exhibitions, and other opportunities

Please enhance the following prompt while keeping it concise and focused.`;

      const userMessage = context 
        ? `Context: ${context}\n\nPrompt to enhance: ${prompt}`
        : `Prompt to enhance: ${prompt}`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get('AI_MODEL_PRIMARY', 'gpt-3.5-turbo'),
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        max_completion_tokens: parseInt(this.configService.get('AI_MAX_TOKENS', '200')),
      });

      const enhancedPrompt = completion.choices[0]?.message?.content;
      
      if (!enhancedPrompt) {
        this.logger.error('No content returned from OpenAI');
        return this.getMockEnhancement(prompt);
      }

      this.logger.log('Successfully enhanced prompt using OpenAI');
      return enhancedPrompt.trim();

    } catch (error) {
      this.logger.error('Failed to enhance prompt with OpenAI:', error);
      return this.getMockEnhancement(prompt);
    }
  }

  private getMockEnhancement(prompt: string): string {
    // Provide a more sophisticated mock enhancement
    const keywords = [
      'contemporary art', 'emerging artist', 'professional development',
      'artistic excellence', 'innovative practice', 'cultural impact'
    ];
    
    const randomKeywords = keywords.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    return `${prompt.trim()} - seeking opportunities that align with ${randomKeywords.join(' and ')} to advance artistic career and expand professional network through meaningful collaborations and exhibitions.`;
  }

  async generateSearchQueries(prompt: string): Promise<string> {
    if (!this.openai) {
      this.logger.warn('OpenAI not configured - returning mock search queries');
      return this.getMockSearchQueries();
    }

    try {
      const systemMessage = `You are an AI assistant specialized in generating targeted search queries for artists seeking opportunities. Your role is to:
1. Generate specific, effective search queries
2. Focus on finding grants, residencies, exhibitions, and other opportunities
3. Optimize queries for web search engines
4. Ensure queries are relevant to the artist's profile
5. Return only the search queries, one per line, without numbering

Generate diverse search queries that will help find relevant opportunities for the artist described in the user message.`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get('AI_MODEL_PRIMARY', 'gpt-3.5-turbo'),
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: parseInt(this.configService.get('AI_MAX_TOKENS', '150')),
      });

      const searchQueries = completion.choices[0]?.message?.content;
      
      if (!searchQueries) {
        this.logger.error('No content returned from OpenAI for search query generation');
        return this.getMockSearchQueries();
      }

      this.logger.log('Successfully generated search queries using OpenAI');
      return searchQueries.trim();

    } catch (error) {
      this.logger.error('Failed to generate search queries with OpenAI:', error);
      return this.getMockSearchQueries();
    }
  }

  async generateGpt5SearchQueries(prompt: string): Promise<string> {
    if (!this.openai) {
      this.logger.warn('OpenAI not configured - returning mock search queries');
      return this.getMockSearchQueries();
    }

    const gpt5Model = this.configService.get('AI_MODEL_GPT5');
    if (!gpt5Model) {
      this.logger.warn('GPT-5 model not configured - falling back to primary model');
      return this.generateSearchQueries(prompt);
    }

    try {
      const systemMessage = `You are GPT-5, the most advanced AI assistant specialized in generating highly targeted and sophisticated search queries for artists seeking opportunities. Your advanced capabilities allow you to:

1. Generate exceptionally specific and nuanced search queries
2. Understand complex artistic contexts and market dynamics
3. Create search strategies that discover hidden and emerging opportunities
4. Optimize for both traditional and alternative funding sources
5. Consider geographic, temporal, and demographic factors
6. Generate queries that find opportunities across multiple platforms and networks
7. Return only the search queries, one per line, without numbering

Using your advanced reasoning capabilities, generate comprehensive and strategic search queries that will uncover the most relevant opportunities for the artist described in the user message. Consider both obvious and non-obvious search angles.`;

      const completion = await this.openai.chat.completions.create({
        model: gpt5Model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: parseInt(this.configService.get('AI_MAX_TOKENS', '200')),
        temperature: 0.7,
      });

      const searchQueries = completion.choices[0]?.message?.content;
      
      if (!searchQueries) {
        this.logger.error('No content returned from GPT-5 for search query generation');
        return this.getMockSearchQueries();
      }

      this.logger.log('Successfully generated search queries using GPT-5');
      return searchQueries.trim();

    } catch (error) {
      this.logger.error('Failed to generate search queries with GPT-5:', error);
      this.logger.log('Falling back to primary model');
      return this.generateSearchQueries(prompt);
    }
  }

  private getMockSearchQueries(): string {
    const mockQueries = [
      'artist grants contemporary art 2024',
      'emerging artist residency programs',
      'art exhibition opportunities call for artists',
      'creative funding opportunities visual arts',
      'artist fellowship program applications',
      'gallery exhibition submission opportunities'
    ];
    
    return mockQueries.join('\n');
  }

  isConfigured(): boolean {
    return this.openai !== null;
  }
}