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
        max_tokens: parseInt(this.configService.get('AI_MAX_TOKENS', '500')),
        temperature: 0.7,
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

  isConfigured(): boolean {
    return this.openai !== null;
  }
}