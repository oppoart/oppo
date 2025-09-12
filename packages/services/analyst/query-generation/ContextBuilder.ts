import { ArtistProfile } from '@prisma/client';
import { ProfileAnalysis } from './ProfileAnalyzer';
import { AIServiceError } from '../../../../apps/backend/src/types/discovery';

export interface AIContext {
  systemPrompt: string;
  userPrompt: string;
  profileSummary: string;
  searchObjectives: string[];
  contextualHints: string[];
  constraints: string[];
  expectedOutputFormat: string;
}

export interface ContextBuilderConfig {
  aiProvider: 'openai' | 'anthropic' | 'google';
  includePersonalInfo: boolean;
  includeGeographicInfo: boolean;
  maxPromptLength: number;
  temperature: number;
}

export class ContextBuilder {
  private config: ContextBuilderConfig;
  private isInitialized: boolean = false;

  constructor(aiProvider: 'openai' | 'anthropic' | 'google' = 'openai') {
    this.config = {
      aiProvider,
      includePersonalInfo: true,
      includeGeographicInfo: true,
      maxPromptLength: 4000,
      temperature: 0.7
    };
  }

  /**
   * Initialize the context builder
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing ContextBuilder...');
    this.isInitialized = true;
  }

  /**
   * Build AI context for query generation based on artist profile and analysis
   */
  async buildContext(
    profile: ArtistProfile,
    analysis: ProfileAnalysis
  ): Promise<AIContext> {
    if (!this.isInitialized) {
      throw new Error('ContextBuilder is not initialized');
    }

    try {
      const profileSummary = this.createProfileSummary(profile, analysis);
      const searchObjectives = this.defineSearchObjectives(analysis);
      const contextualHints = this.generateContextualHints(analysis);
      const constraints = this.defineConstraints(analysis);

      const systemPrompt = this.buildSystemPrompt(analysis);
      const userPrompt = this.buildUserPrompt(profileSummary, searchObjectives, contextualHints);

      return {
        systemPrompt,
        userPrompt,
        profileSummary,
        searchObjectives,
        contextualHints,
        constraints,
        expectedOutputFormat: this.getExpectedOutputFormat()
      };

    } catch (error) {
      throw new AIServiceError(
        `Failed to build AI context: ${error}`,
        this.config.aiProvider,
        'context-building',
        { profileId: profile.id }
      );
    }
  }

  /**
   * Create a concise profile summary for AI context
   */
  private createProfileSummary(profile: ArtistProfile, analysis: ProfileAnalysis): string {
    const parts: string[] = [];

    // Basic info
    parts.push(`Artist Name: ${profile.name}`);
    
    // Primary mediums
    if (analysis.primaryMediums.length > 0) {
      parts.push(`Primary Mediums: ${analysis.primaryMediums.join(', ')}`);
    }

    // Experience level
    parts.push(`Experience Level: ${analysis.experienceLevel.category}`);
    if (analysis.experienceLevel.yearsEstimate) {
      parts.push(`Years of Experience: ~${analysis.experienceLevel.yearsEstimate}`);
    }

    // Core skills
    if (analysis.coreSkills.length > 0) {
      parts.push(`Core Skills: ${analysis.coreSkills.slice(0, 4).join(', ')}`);
    }

    // Primary interests
    if (analysis.primaryInterests.length > 0) {
      parts.push(`Artistic Interests: ${analysis.primaryInterests.slice(0, 3).join(', ')}`);
    }

    // Location (if configured to include)
    if (this.config.includeGeographicInfo && analysis.geographicScope.city) {
      parts.push(`Location: ${analysis.geographicScope.city}${analysis.geographicScope.state ? `, ${analysis.geographicScope.state}` : ''}`);
    }

    // Artist statement summary (first 200 chars)
    if (profile.artistStatement) {
      const statement = profile.artistStatement.substring(0, 200);
      parts.push(`Artist Focus: ${statement}${profile.artistStatement.length > 200 ? '...' : ''}`);
    }

    return parts.join('\n');
  }

  /**
   * Define search objectives based on profile analysis
   */
  private defineSearchObjectives(analysis: ProfileAnalysis): string[] {
    const objectives: string[] = [];

    // Medium-specific objectives
    if (analysis.primaryMediums.length > 0) {
      objectives.push(`Find opportunities specifically for ${analysis.primaryMediums.join(' and ')} artists`);
    }

    // Experience-level specific objectives
    switch (analysis.experienceLevel.category) {
      case 'beginner':
        objectives.push('Find beginner-friendly opportunities, workshops, and learning experiences');
        objectives.push('Look for mentorship programs and emerging artist supports');
        break;
      case 'intermediate':
        objectives.push('Find grants, competitions, and exhibition opportunities for developing artists');
        objectives.push('Look for professional development and career advancement opportunities');
        break;
      case 'advanced':
      case 'professional':
        objectives.push('Find high-level grants, fellowships, and prestigious exhibition opportunities');
        objectives.push('Look for teaching, residency, and leadership opportunities');
        break;
    }

    // Interest-based objectives
    if (analysis.primaryInterests.includes('contemporary art')) {
      objectives.push('Focus on contemporary and modern art opportunities');
    }
    if (analysis.primaryInterests.includes('social art')) {
      objectives.push('Include socially engaged and community-based art opportunities');
    }
    if (analysis.primaryInterests.includes('environmental art')) {
      objectives.push('Look for environmental and sustainability-focused art opportunities');
    }

    // Geographic objectives
    if (analysis.geographicScope.city) {
      objectives.push(`Include both local opportunities in ${analysis.geographicScope.city} area and remote/online opportunities`);
    }

    return objectives.slice(0, 6); // Limit to top 6 objectives
  }

  /**
   * Generate contextual hints to guide AI query generation
   */
  private generateContextualHints(analysis: ProfileAnalysis): string[] {
    const hints: string[] = [];

    // Medium-specific hints
    hints.push('Use specific medium names rather than generic "art" terms');
    hints.push('Include both traditional and contemporary terminology for mediums');

    // Search strategy hints
    hints.push('Create queries that balance specificity with broad appeal');
    hints.push('Include location modifiers for geographically relevant opportunities');
    hints.push('Use funding amount ranges when appropriate');

    // Quality hints
    hints.push('Focus on legitimate, established organizations and institutions');
    hints.push('Prioritize opportunities with clear deadlines and application processes');

    // Experience-level hints
    if (analysis.experienceLevel.category === 'beginner') {
      hints.push('Emphasize accessibility and educational value in search terms');
    } else if (analysis.experienceLevel.category === 'professional') {
      hints.push('Use professional terminology and focus on career-advancing opportunities');
    }

    return hints;
  }

  /**
   * Define constraints for query generation
   */
  private defineConstraints(analysis: ProfileAnalysis): string[] {
    const constraints: string[] = [];

    // Quality constraints
    constraints.push('Avoid scam or pay-to-play opportunities');
    constraints.push('Focus on reputable organizations and institutions');
    constraints.push('Exclude expired or past-deadline opportunities');

    // Relevance constraints
    constraints.push('Ensure opportunities match the artist\'s mediums and experience level');
    
    // Geographic constraints
    if (!analysis.geographicScope.isRemoteEligible) {
      constraints.push('Focus on geographically accessible opportunities');
    }

    return constraints;
  }

  /**
   * Build the system prompt for AI query generation
   */
  private buildSystemPrompt(analysis: ProfileAnalysis): string {
    const basePrompt = `You are an expert art opportunity researcher specializing in finding relevant grants, exhibitions, residencies, and other professional opportunities for artists.

Your task is to generate targeted search queries that will discover opportunities specifically relevant to the artist's profile, mediums, experience level, and interests.

Key principles:
1. Generate specific, actionable search queries that real search engines can process
2. Balance specificity with breadth to capture relevant opportunities
3. Use professional art world terminology appropriately
4. Consider multiple angles: medium-specific, geographic, experience-appropriate, and interest-based
5. Create queries that would return opportunities from legitimate arts organizations, institutions, and funding bodies

Query characteristics:
- Length: 5-15 words per query
- Specificity: Include medium, location, or opportunity type when relevant
- Variety: Mix different search angles and approaches
- Professionalism: Use terms that arts professionals would use

Focus areas for this artist:
- Primary mediums: ${analysis.primaryMediums.join(', ')}
- Experience level: ${analysis.experienceLevel.category}
- Key interests: ${analysis.primaryInterests.join(', ')}`;

    return basePrompt;
  }

  /**
   * Build the user prompt for AI query generation
   */
  private buildUserPrompt(
    profileSummary: string,
    searchObjectives: string[],
    contextualHints: string[]
  ): string {
    const prompt = `Based on the following artist profile, generate search queries to find relevant art opportunities:

ARTIST PROFILE:
${profileSummary}

SEARCH OBJECTIVES:
${searchObjectives.map(obj => `- ${obj}`).join('\n')}

CONTEXTUAL GUIDANCE:
${contextualHints.map(hint => `- ${hint}`).join('\n')}

Please generate 8-12 diverse search queries that would effectively discover opportunities for this artist. Each query should be optimized for different search engines and opportunity discovery platforms.

Format: Return only the search queries, one per line, without numbering or additional commentary.`;

    // Ensure prompt doesn't exceed max length
    if (prompt.length > this.config.maxPromptLength) {
      return this.truncatePrompt(prompt, this.config.maxPromptLength);
    }

    return prompt;
  }

  /**
   * Get expected output format description
   */
  private getExpectedOutputFormat(): string {
    return `Expected output: 8-12 search queries, one per line, each 5-15 words long, optimized for discovering art opportunities relevant to the artist's profile.`;
  }

  /**
   * Truncate prompt if it exceeds maximum length
   */
  private truncatePrompt(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) return prompt;

    const sections = prompt.split('\n\n');
    let truncated = sections[0]; // Always keep the first section

    for (let i = 1; i < sections.length; i++) {
      const withNext = truncated + '\n\n' + sections[i];
      if (withNext.length > maxLength - 100) { // Leave some buffer
        truncated += '\n\n[Additional context truncated for brevity]';
        break;
      }
      truncated = withNext;
    }

    return truncated;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextBuilderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextBuilderConfig {
    return { ...this.config };
  }

  /**
   * Shutdown the context builder
   */
  async shutdown(): Promise<void> {
    this.isInitialized = false;
  }
}