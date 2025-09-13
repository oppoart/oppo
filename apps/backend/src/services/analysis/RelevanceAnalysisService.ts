import OpenAI from 'openai';
import { ScrapedOpportunity } from '../scraper/WebScraperService';

export interface ArtistProfile {
  id: string;
  name: string;
  mediums: string[];
  bio?: string;
  artistStatement?: string;
  skills: string[];
  interests: string[];
  experience?: string;
  location?: string;
}

export interface RelevanceScore {
  overallScore: number; // 0-100
  confidence: number;   // 0-100
  reasoning: string;
  breakdown: {
    mediumMatch: number;    // 0-100
    skillMatch: number;     // 0-100
    locationMatch: number;  // 0-100
    experienceMatch: number; // 0-100
    interestMatch: number;  // 0-100
    deadlineViability: number; // 0-100
    artRelevance: number;   // 0-100
  };
  tags: string[];
  recommendation: 'high' | 'medium' | 'low' | 'not-relevant';
  warnings?: string[];
  actionItems?: string[];
}

export interface RelevanceAnalysisResult {
  opportunityId?: string;
  userId: string;
  profileId: string;
  relevanceScore: RelevanceScore;
  processedAt: Date;
  processingTime: number;
  aiService: string;
  success: boolean;
  error?: string;
}

export class RelevanceAnalysisService {
  private openai: OpenAI | null = null;
  private fallbackMode = false;

  constructor() {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('🤖 OpenAI initialized for relevance analysis');
    } else {
      this.fallbackMode = true;
      console.warn('⚠️ No OpenAI API key provided, using rule-based analysis');
    }
  }

  /**
   * Main analysis method - analyzes scraped opportunity against artist profile
   */
  async analyzeRelevance(
    opportunity: ScrapedOpportunity, 
    artistProfile: ArtistProfile
  ): Promise<RelevanceAnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Analyzing relevance for "${opportunity.title}" against profile "${artistProfile.name}"`);

      let relevanceScore: RelevanceScore;
      
      if (this.openai && !this.fallbackMode) {
        relevanceScore = await this.analyzeWithAI(opportunity, artistProfile);
      } else {
        relevanceScore = await this.analyzeWithRules(opportunity, artistProfile);
      }

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Relevance analysis complete: ${relevanceScore.overallScore}% (${relevanceScore.recommendation})`);

      return {
        userId: 'unknown', // userId is provided by the route handler
        profileId: artistProfile.id,
        relevanceScore,
        processedAt: new Date(),
        processingTime,
        aiService: this.fallbackMode ? 'rule-based' : 'openai',
        success: true
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      console.error(`❌ Relevance analysis failed for "${opportunity.title}":`, error);
      
      // Return fallback analysis on error
      const fallbackScore = await this.analyzeWithRules(opportunity, artistProfile);
      
      return {
        userId: 'unknown', // userId is provided by the route handler
        profileId: artistProfile.id,
        relevanceScore: fallbackScore,
        processedAt: new Date(),
        processingTime,
        aiService: 'rule-based-fallback',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * AI-powered analysis using OpenAI
   */
  private async analyzeWithAI(
    opportunity: ScrapedOpportunity, 
    artistProfile: ArtistProfile
  ): Promise<RelevanceScore> {
    const prompt = this.buildAnalysisPrompt(opportunity, artistProfile);
    
    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert art career advisor specializing in matching artists with relevant opportunities. 
          Analyze the opportunity against the artist profile and provide detailed scoring and recommendations.
          Be thorough but realistic in your assessment.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return this.parseAIResponse(response, opportunity, artistProfile);
  }

  /**
   * Rule-based analysis fallback
   */
  private async analyzeWithRules(
    opportunity: ScrapedOpportunity, 
    artistProfile: ArtistProfile
  ): Promise<RelevanceScore> {
    const breakdown = {
      mediumMatch: this.scoreMediumMatch(opportunity, artistProfile),
      skillMatch: this.scoreSkillMatch(opportunity, artistProfile),
      locationMatch: this.scoreLocationMatch(opportunity, artistProfile),
      experienceMatch: this.scoreExperienceMatch(opportunity, artistProfile),
      interestMatch: this.scoreInterestMatch(opportunity, artistProfile),
      deadlineViability: this.scoreDeadlineViability(opportunity),
      artRelevance: this.scoreArtRelevance(opportunity)
    };

    // Weighted average
    const weights = {
      mediumMatch: 0.25,
      skillMatch: 0.15,
      locationMatch: 0.10,
      experienceMatch: 0.15,
      interestMatch: 0.15,
      deadlineViability: 0.10,
      artRelevance: 0.10
    };

    const overallScore = Math.round(
      Object.entries(breakdown).reduce((sum, [key, score]) => {
        return sum + (score * weights[key as keyof typeof weights]);
      }, 0)
    );

    const recommendation = this.getRecommendation(overallScore);
    const reasoning = this.generateRuleBasedReasoning(breakdown, opportunity, artistProfile);
    const tags = this.generateTags(opportunity, artistProfile);
    const warnings = this.generateWarnings(opportunity, breakdown);
    const actionItems = this.generateActionItems(opportunity, breakdown);

    return {
      overallScore,
      confidence: 85, // Rule-based has good confidence
      reasoning,
      breakdown,
      tags,
      recommendation,
      warnings,
      actionItems
    };
  }

  /**
   * Score how well the opportunity matches the artist's mediums
   */
  private scoreMediumMatch(opportunity: ScrapedOpportunity, profile: ArtistProfile): number {
    const oppText = `${opportunity.title} ${opportunity.description} ${opportunity.tags?.join(' ') || ''}`.toLowerCase();
    const profileMediums = profile.mediums.map(m => m.toLowerCase());
    
    let score = 0;
    let matches = 0;

    for (const medium of profileMediums) {
      if (medium === 'other') continue;
      
      // Direct matches
      if (oppText.includes(medium)) {
        score += 30;
        matches++;
      }
      
      // Synonym matches
      const synonyms = this.getMediumSynonyms(medium);
      for (const synonym of synonyms) {
        if (oppText.includes(synonym)) {
          score += 20;
          matches++;
          break;
        }
      }
    }

    // Bonus for multiple matches
    if (matches > 1) {
      score += matches * 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Score skill relevance
   */
  private scoreSkillMatch(opportunity: ScrapedOpportunity, profile: ArtistProfile): number {
    const oppText = `${opportunity.title} ${opportunity.description} ${opportunity.requirements?.join(' ') || ''}`.toLowerCase();
    const profileSkills = profile.skills.map(s => s.toLowerCase());
    
    let matches = 0;
    for (const skill of profileSkills) {
      if (oppText.includes(skill)) {
        matches++;
      }
    }

    return Math.min((matches / Math.max(profileSkills.length, 1)) * 100, 100);
  }

  /**
   * Score location compatibility
   */
  private scoreLocationMatch(opportunity: ScrapedOpportunity, profile: ArtistProfile): number {
    if (!opportunity.location && !profile.location) return 70; // Neutral if both unknown
    if (!opportunity.location) return 60; // Slightly lower if opp location unknown
    if (!profile.location) return 50; // Lower if profile location unknown
    
    const oppLocation = opportunity.location.toLowerCase();
    const profileLocation = profile.location.toLowerCase();
    
    // Exact match
    if (oppLocation.includes(profileLocation) || profileLocation.includes(oppLocation)) {
      return 100;
    }
    
    // Remote/online opportunities
    if (oppLocation.includes('remote') || oppLocation.includes('online') || oppLocation.includes('virtual')) {
      return 90;
    }
    
    // International opportunities
    if (oppLocation.includes('international') || oppLocation.includes('worldwide')) {
      return 80;
    }
    
    // Same country heuristics (basic)
    const sameCountryKeywords = ['usa', 'united states', 'uk', 'canada', 'australia', 'germany', 'france'];
    for (const country of sameCountryKeywords) {
      if (oppLocation.includes(country) && profileLocation.includes(country)) {
        return 75;
      }
    }
    
    return 30; // Different locations
  }

  /**
   * Score experience level match
   */
  private scoreExperienceMatch(opportunity: ScrapedOpportunity, profile: ArtistProfile): number {
    const oppText = `${opportunity.title} ${opportunity.description} ${opportunity.requirements?.join(' ') || ''}`.toLowerCase();
    
    // Determine opportunity level
    let oppLevel = 'all';
    if (oppText.includes('emerging') || oppText.includes('student') || oppText.includes('early career')) {
      oppLevel = 'emerging';
    } else if (oppText.includes('established') || oppText.includes('professional') || oppText.includes('experienced')) {
      oppLevel = 'established';
    } else if (oppText.includes('mid-career') || oppText.includes('intermediate')) {
      oppLevel = 'mid-career';
    }
    
    // Determine artist level from profile
    const profileText = `${profile.bio || ''} ${profile.experience || ''}`.toLowerCase();
    let artistLevel = 'emerging';
    if (profileText.includes('years') && (profileText.includes('10') || profileText.includes('15') || profileText.includes('20'))) {
      artistLevel = 'established';
    } else if (profileText.includes('5') || profileText.includes('experienced')) {
      artistLevel = 'mid-career';
    }
    
    // Score the match
    if (oppLevel === 'all') return 80;
    if (oppLevel === artistLevel) return 100;
    if ((oppLevel === 'emerging' && artistLevel === 'mid-career') ||
        (oppLevel === 'mid-career' && artistLevel === 'established')) return 90;
    if ((oppLevel === 'emerging' && artistLevel === 'established') ||
        (oppLevel === 'established' && artistLevel === 'emerging')) return 60;
    
    return 70;
  }

  /**
   * Score interest alignment
   */
  private scoreInterestMatch(opportunity: ScrapedOpportunity, profile: ArtistProfile): number {
    const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
    const profileInterests = profile.interests.map(i => i.toLowerCase());
    
    let matches = 0;
    for (const interest of profileInterests) {
      if (oppText.includes(interest)) {
        matches++;
      }
    }

    return Math.min((matches / Math.max(profileInterests.length, 1)) * 100, 100);
  }

  /**
   * Score deadline viability
   */
  private scoreDeadlineViability(opportunity: ScrapedOpportunity): number {
    if (!opportunity.deadline) return 50; // Unknown deadline
    
    const now = new Date();
    const deadline = new Date(opportunity.deadline);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 0) return 0;  // Past deadline
    if (daysUntilDeadline < 7) return 30; // Very tight
    if (daysUntilDeadline < 14) return 60; // Tight
    if (daysUntilDeadline < 30) return 85; // Good
    return 100; // Plenty of time
  }

  /**
   * Score art relevance (is this actually an art opportunity?)
   */
  private scoreArtRelevance(opportunity: ScrapedOpportunity): number {
    const text = `${opportunity.title} ${opportunity.description}`.toLowerCase();
    
    const artKeywords = [
      'art', 'artist', 'artistic', 'artwork', 'exhibition', 'gallery', 'museum',
      'painting', 'sculpture', 'drawing', 'photography', 'printmaking', 'ceramics',
      'installation', 'performance', 'digital art', 'new media', 'contemporary',
      'fine art', 'visual art', 'creative', 'residency', 'fellowship', 'grant'
    ];
    
    const nonArtKeywords = [
      'job', 'employment', 'salary', 'full-time', 'part-time', 'software engineer',
      'marketing', 'sales', 'administrative', 'customer service', 'data entry'
    ];
    
    let artScore = 0;
    let nonArtScore = 0;
    
    for (const keyword of artKeywords) {
      if (text.includes(keyword)) artScore++;
    }
    
    for (const keyword of nonArtKeywords) {
      if (text.includes(keyword)) nonArtScore++;
    }
    
    if (nonArtScore > artScore) return 20; // Likely not an art opportunity
    if (artScore === 0) return 40; // No clear art keywords
    if (artScore >= 3) return 100; // Strong art relevance
    if (artScore >= 2) return 85;  // Good art relevance
    return 70; // Some art relevance
  }

  /**
   * Get synonym mappings for mediums
   */
  private getMediumSynonyms(medium: string): string[] {
    const synonymMap: { [key: string]: string[] } = {
      'painting': ['paint', 'oil', 'acrylic', 'watercolor', 'canvas'],
      'digital': ['digital art', 'computer art', 'new media', 'interactive', 'generative'],
      'sculpture': ['sculptural', '3d', 'installation', 'mixed media'],
      'photography': ['photo', 'photographic', 'camera', 'image'],
      'printmaking': ['print', 'etching', 'lithography', 'screen print'],
      'drawing': ['sketch', 'illustration', 'pen', 'pencil', 'charcoal'],
      'performance': ['live art', 'body art', 'conceptual', 'time-based'],
      'video': ['film', 'moving image', 'multimedia', 'animation']
    };
    
    return synonymMap[medium] || [];
  }

  /**
   * Generate rule-based reasoning
   */
  private generateRuleBasedReasoning(
    breakdown: RelevanceScore['breakdown'], 
    opportunity: ScrapedOpportunity, 
    profile: ArtistProfile
  ): string {
    const strongPoints = [];
    const weakPoints = [];
    
    Object.entries(breakdown).forEach(([key, score]) => {
      const label = key.replace(/([A-Z])/g, ' $1').toLowerCase();
      if (score >= 80) {
        strongPoints.push(`excellent ${label} (${score}%)`);
      } else if (score >= 60) {
        strongPoints.push(`good ${label} (${score}%)`);
      } else if (score < 40) {
        weakPoints.push(`weak ${label} (${score}%)`);
      }
    });
    
    let reasoning = `Analysis for "${opportunity.title}": `;
    
    if (strongPoints.length > 0) {
      reasoning += `Strong matches include ${strongPoints.join(', ')}. `;
    }
    
    if (weakPoints.length > 0) {
      reasoning += `Areas of concern: ${weakPoints.join(', ')}. `;
    }
    
    return reasoning;
  }

  /**
   * Generate tags for the opportunity
   */
  private generateTags(opportunity: ScrapedOpportunity, profile: ArtistProfile): string[] {
    const tags: string[] = [];
    
    // Add existing opportunity tags
    if (opportunity.tags) {
      tags.push(...opportunity.tags);
    }
    
    // Add profile medium tags that match
    const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
    for (const medium of profile.mediums) {
      if (oppText.includes(medium.toLowerCase())) {
        tags.push(medium);
      }
    }
    
    // Add opportunity type tags
    if (opportunity.amount) tags.push('funded');
    if (opportunity.location?.includes('remote')) tags.push('remote');
    if (opportunity.deadline) tags.push('deadline-sensitive');
    
    return [...new Set(tags)].slice(0, 10); // Dedupe and limit
  }

  /**
   * Generate warnings
   */
  private generateWarnings(opportunity: ScrapedOpportunity, breakdown: RelevanceScore['breakdown']): string[] {
    const warnings = [];
    
    if (breakdown.deadlineViability < 50) {
      warnings.push('Tight deadline - apply soon');
    }
    
    if (breakdown.artRelevance < 60) {
      warnings.push('May not be specifically an art opportunity');
    }
    
    if (breakdown.locationMatch < 40) {
      warnings.push('Location may not be compatible');
    }
    
    return warnings;
  }

  /**
   * Generate action items
   */
  private generateActionItems(opportunity: ScrapedOpportunity, breakdown: RelevanceScore['breakdown']): string[] {
    const items = [];
    
    if (opportunity.applicationUrl) {
      items.push('Review full application requirements');
    }
    
    if (opportunity.contactEmail) {
      items.push('Consider reaching out for more information');
    }
    
    if (breakdown.deadlineViability < 70) {
      items.push('Prioritize due to approaching deadline');
    }
    
    return items;
  }

  /**
   * Get recommendation level
   */
  private getRecommendation(score: number): RelevanceScore['recommendation'] {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'not-relevant';
  }

  /**
   * Build prompt for AI analysis
   */
  private buildAnalysisPrompt(opportunity: ScrapedOpportunity, profile: ArtistProfile): string {
    return `
OPPORTUNITY ANALYSIS REQUEST

ARTIST PROFILE:
Name: ${profile.name}
Mediums: ${profile.mediums.join(', ')}
Skills: ${profile.skills.join(', ')}
Interests: ${profile.interests.join(', ')}
Location: ${profile.location || 'Not specified'}
Bio: ${profile.bio || 'Not provided'}
Experience: ${profile.experience || 'Not specified'}

OPPORTUNITY TO ANALYZE:
Title: ${opportunity.title}
Organization: ${opportunity.organization || 'Not specified'}
Description: ${opportunity.description}
Location: ${opportunity.location || 'Not specified'}
Deadline: ${opportunity.deadline || 'Not specified'}
Amount: ${opportunity.amount || 'Not specified'}
Requirements: ${opportunity.requirements?.join(', ') || 'Not specified'}
Categories: ${opportunity.category || 'Not specified'}
Tags: ${opportunity.tags?.join(', ') || 'None'}

Please analyze this opportunity against the artist profile and return a JSON response with:
{
  "overallScore": <0-100>,
  "confidence": <0-100>,
  "reasoning": "<detailed explanation>",
  "breakdown": {
    "mediumMatch": <0-100>,
    "skillMatch": <0-100>,
    "locationMatch": <0-100>,
    "experienceMatch": <0-100>,
    "interestMatch": <0-100>,
    "deadlineViability": <0-100>,
    "artRelevance": <0-100>
  },
  "recommendation": "<high|medium|low|not-relevant>",
  "tags": ["<relevant-tags>"],
  "warnings": ["<any-concerns>"],
  "actionItems": ["<next-steps>"]
}
    `;
  }

  /**
   * Parse AI response
   */
  private parseAIResponse(response: string, opportunity: ScrapedOpportunity, profile: ArtistProfile): RelevanceScore {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and ensure all required fields
      return {
        overallScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
        confidence: Math.max(0, Math.min(100, parsed.confidence || 70)),
        reasoning: parsed.reasoning || 'AI analysis completed',
        breakdown: {
          mediumMatch: Math.max(0, Math.min(100, parsed.breakdown?.mediumMatch || 0)),
          skillMatch: Math.max(0, Math.min(100, parsed.breakdown?.skillMatch || 0)),
          locationMatch: Math.max(0, Math.min(100, parsed.breakdown?.locationMatch || 50)),
          experienceMatch: Math.max(0, Math.min(100, parsed.breakdown?.experienceMatch || 50)),
          interestMatch: Math.max(0, Math.min(100, parsed.breakdown?.interestMatch || 0)),
          deadlineViability: Math.max(0, Math.min(100, parsed.breakdown?.deadlineViability || 50)),
          artRelevance: Math.max(0, Math.min(100, parsed.breakdown?.artRelevance || 0))
        },
        recommendation: parsed.recommendation || 'medium',
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 5) : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.slice(0, 5) : []
      };
    } catch (error) {
      console.warn('Failed to parse AI response, falling back to rule-based analysis');
      return this.analyzeWithRules(opportunity, profile);
    }
  }

  /**
   * Batch analyze multiple opportunities
   */
  async analyzeBatch(
    opportunities: ScrapedOpportunity[], 
    artistProfile: ArtistProfile
  ): Promise<RelevanceAnalysisResult[]> {
    console.log(`🔍 Starting batch relevance analysis for ${opportunities.length} opportunities`);
    
    const results = [];
    const BATCH_SIZE = 3; // Process in small batches to avoid rate limits
    
    for (let i = 0; i < opportunities.length; i += BATCH_SIZE) {
      const batch = opportunities.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(opp => this.analyzeRelevance(opp, artistProfile));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + BATCH_SIZE < opportunities.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`📊 Processed ${i + batch.length}/${opportunities.length} opportunities`);
    }
    
    console.log(`✅ Batch analysis complete: ${results.length} opportunities analyzed`);
    return results;
  }
}

// Singleton instance
export const relevanceAnalysisService = new RelevanceAnalysisService();