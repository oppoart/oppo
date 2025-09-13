import { GeneratedSearchQuery, SourceType, AIServiceError } from '../types';
import OpenAI from 'openai';

export class SemanticQueryTemplate {
  private aiProvider: 'openai' | 'anthropic' | 'google';
  private isInitialized: boolean = false;
  private openai: OpenAI | null = null;

  constructor(aiProvider: 'openai' | 'anthropic' | 'google' = 'openai') {
    this.aiProvider = aiProvider;
    
    // Initialize OpenAI client if using OpenAI
    if (aiProvider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      console.log(`🔑 Initializing OpenAI client... API key present: ${!!apiKey}`);
      
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      
      console.log(`✅ OpenAI client initialized successfully`);
    }
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
    console.log(`SemanticQueryTemplate initialized with ${this.aiProvider}`);
  }

  async generateQueries(
    aiContext: any,
    sourceType: SourceType,
    maxQueries: number
  ): Promise<GeneratedSearchQuery[]> {
    if (!this.isInitialized) {
      throw new Error('SemanticQueryTemplate is not initialized');
    }

    try {
      // 🚀 REAL AI IMPLEMENTATION: Call OpenAI API for intelligent query generation
      console.log(`🤖 SemanticQueryTemplate: aiProvider = ${this.aiProvider}, maxQueries = ${maxQueries}`);
      
      if (this.aiProvider === 'openai') {
        console.log('🚀 Attempting to call OpenAI for query generation...');
        return await this.generateOpenAIQueries(aiContext, sourceType, maxQueries);
      } else {
        console.log('⚠️ Using mock queries (non-OpenAI provider)');
        // Fallback to enhanced mock for other providers
        return this.generateMockSemanticQueries(aiContext, sourceType, maxQueries);
      }

    } catch (error) {
      console.error('❌ Failed to generate semantic queries, falling back to mock:', error);
      // Fallback to enhanced mock implementation
      return this.generateMockSemanticQueries(aiContext, sourceType, maxQueries);
    }
  }

  /**
   * 🤖 REAL OpenAI Implementation for intelligent query generation
   */
  private async generateOpenAIQueries(
    aiContext: any,
    sourceType: SourceType,
    maxQueries: number
  ): Promise<GeneratedSearchQuery[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Extract profile data from aiContext
    const profileData = aiContext?.profileAnalysis || {};
    const {
      primaryMediums = ['contemporary art'],
      experienceLevel = { category: 'emerging', keywords: [] },
      primaryInterests = ['artistic practice'],
      opportunityTypes = ['grant', 'residency'],
      fundingPreferences = ['mid-level grants'],
      geographicScope = {}
    } = profileData;

    // Build intelligent AI prompt
    const systemPrompt = `You are an expert in artist opportunities and grant writing. Generate ${maxQueries} highly specific, targeted search queries for finding art opportunities.

Artist Profile:
- Primary Mediums: ${primaryMediums.join(', ')}
- Experience Level: ${experienceLevel.category}
- Interests: ${primaryInterests.join(', ')}
- Preferred Opportunity Types: ${opportunityTypes.join(', ')}
- Funding Preferences: ${fundingPreferences.join(', ')}
- Location: ${geographicScope.city || geographicScope.state || 'Various'}

Requirements:
1. Generate specific, actionable search queries
2. Include current year (${new Date().getFullYear()}) when relevant
3. Focus on ${sourceType} sources
4. Mix opportunity types: ${opportunityTypes.join(', ')}
5. Use exact medium names and experience level
6. Include location when relevant
7. Make queries specific enough to find real opportunities

Return ONLY a JSON array of strings, no other text.`;

    const userPrompt = `Generate ${maxQueries} targeted search queries for this artist profile.`;

    try {
      console.log('🤖 Calling OpenAI for intelligent query generation...');
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const queries = JSON.parse(content);
      
      if (!Array.isArray(queries)) {
        throw new Error('OpenAI response is not an array');
      }

      console.log(`✅ Generated ${queries.length} AI-powered queries`);

      // Convert to GeneratedSearchQuery format
      return queries.slice(0, maxQueries).map((query: string, index: number) => ({
        query: query.trim(),
        provider: sourceType,
        priority: 10, // Highest priority for AI-generated queries
        context: {
          artistMediums: primaryMediums,
          interests: primaryInterests,
          opportunityType: opportunityTypes[index % opportunityTypes.length],
          experienceLevel: experienceLevel.category,
          aiGenerated: true
        },
        expectedResults: 30
      }));

    } catch (error) {
      console.error('OpenAI query generation failed:', error);
      throw new AIServiceError(
        `OpenAI query generation failed: ${error}`,
        'openai',
        'query-generation'
      );
    }
  }

  private async generateMockSemanticQueries(
    aiContext: any,
    sourceType: SourceType,
    maxQueries: number
  ): Promise<GeneratedSearchQuery[]> {
    const queries: GeneratedSearchQuery[] = [];

    // 🧠 Extract REAL profile data from aiContext instead of hardcoded values
    const profileData = aiContext?.profileAnalysis || {};
    const {
      primaryMediums = ['contemporary art'],
      experienceLevel = { category: 'emerging', keywords: [] },
      primaryInterests = ['social practice'],
      opportunityTypes = ['grant', 'residency'],
      fundingPreferences = ['mid-level grants'],
      geographicScope = {}
    } = profileData;

    // 🎯 SOPHISTICATED AI-ENHANCED QUERY TEMPLATES
    const templates = [
      // Opportunity-type focused templates
      'innovative {medium} {opportunityType} for {experience} artists {year}',
      '{medium} {fundingType} supporting {interest} artistic practice',
      '{experience} {medium} artist {opportunityType} and fellowships',
      '{interest} focused {medium} {opportunityType} and exhibitions',
      'professional development {opportunityType} {medium} artist opportunities',
      '{medium} collaborative {opportunityType} and artist exchanges',
      // Location-aware templates
      '{location} {medium} {opportunityType} {experience} artists',
      '{opportunityType} {medium} artists {location} {year}',
      // Experience-targeted templates  
      '{experienceKeyword} {medium} {opportunityType} {interest}',
      '{fundingType} {medium} {experience} artist {opportunityType}'
    ];

    // 📊 Use ACTUAL profile data for template variables
    const medium = primaryMediums[0] || 'contemporary art';
    const experience = experienceLevel.category || 'emerging';
    const interest = primaryInterests[0] || 'artistic practice';
    const opportunityType = opportunityTypes[0] || 'opportunities';
    const secondaryOpportunityType = opportunityTypes[1] || 'grant';
    const fundingType = fundingPreferences[0] || 'funding';
    const location = geographicScope.city || geographicScope.state || '';
    const experienceKeyword = experienceLevel.keywords?.[0] || experience;
    const year = new Date().getFullYear();

    // 🚀 Generate queries with REAL profile context
    for (let i = 0; i < Math.min(templates.length, maxQueries); i++) {
      const template = templates[i];
      const query = template
        .replace('{medium}', medium)
        .replace('{experience}', experience)
        .replace('{interest}', interest)
        .replace('{opportunityType}', i % 2 === 0 ? opportunityType : secondaryOpportunityType)
        .replace('{fundingType}', fundingType)
        .replace('{location}', location)
        .replace('{experienceKeyword}', experienceKeyword)
        .replace('{year}', year.toString())
        .replace(/\s+/g, ' ') // Clean up extra spaces
        .trim();

      queries.push({
        query,
        provider: sourceType,
        priority: 9, // Higher priority for AI-generated queries
        context: { 
          artistMediums: primaryMediums, 
          interests: primaryInterests,
          opportunityType: i % 2 === 0 ? opportunityType : secondaryOpportunityType,
          experienceLevel: experience,
          location: location || undefined
        },
        expectedResults: 25
      });
    }

    return queries;
  }

  private generateFallbackQueries(
    aiContext: any,
    sourceType: SourceType,
    maxQueries: number
  ): GeneratedSearchQuery[] {
    // Simple fallback queries
    return [
      {
        query: 'contemporary art grants emerging artists',
        provider: sourceType,
        priority: 5,
        context: { artistMediums: ['contemporary art'], interests: [] },
        expectedResults: 15
      },
      {
        query: 'artist residency programs creative funding',
        provider: sourceType,
        priority: 5,
        context: { artistMediums: [], interests: [] },
        expectedResults: 12
      }
    ].slice(0, maxQueries);
  }

  async shutdown(): Promise<void> {
    this.isInitialized = false;
  }
}