import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalystService {
  private readonly logger = new Logger(AnalystService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('Analyst service initialized (stub implementation)');
  }

  @OnEvent('analyst.analyze_opportunity')
  async handleAnalyzeOpportunityEvent(opportunity: any) {
    this.logger.log('Received analyze opportunity event', { opportunityId: opportunity.id });
    
    const analysisResult = await this.analyzeOpportunity(opportunity);
    
    // Emit analyzed opportunity event
    this.eventEmitter.emit('orchestrator.opportunity_analyzed', {
      ...opportunity,
      ...analysisResult,
    });
    
    return analysisResult;
  }

  async analyzeOpportunity(opportunity: any, profileId?: string) {
    // TODO: Implement actual analysis when core service is available
    return {
      relevanceScore: Math.random(),
      confidence: 0.8,
      reasoning: 'Stub analysis result',
    };
  }

  async generateQueries(profileId: string, opportunityType: string = 'all') {
    // TODO: Implement actual query generation
    return [
      `artist opportunities ${opportunityType}`,
      `creative residencies ${opportunityType}`,
      `art grants ${opportunityType}`,
    ];
  }

  async analyzeRelevance(profileId: string, opportunities: any[]) {
    // TODO: Implement actual relevance analysis
    return opportunities.map(opp => ({
      ...opp,
      relevanceScore: Math.random(),
      confidence: 0.8,
    }));
  }

  async getAnalysisStats() {
    return {
      totalAnalyses: 0,
      averageScore: 0,
      cacheHitRate: 0,
    };
  }

  async getAnalysisHistory(profileId?: string, limit: number = 100) {
    return [];
  }

  async updatePersonalizationWeights(profileId: string, feedback: any) {
    this.logger.log('Personalization weights update stubbed', { profileId });
  }

  async getPersonalizationInsights(profileId: string) {
    return {
      profileId,
      insights: [],
    };
  }

  async trainModel(trainingData: any[]) {
    return {
      success: true,
      message: 'Model training stubbed',
      dataPoints: trainingData.length,
    };
  }

  async analyzeProfileQuality(profileId: string) {
    this.logger.log(`Analyzing profile quality for profile: ${profileId}`);

    // Fetch the profile from database
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Calculate metrics
    const metrics = {
      bioLength: profile.bio?.length || 0,
      statementLength: profile.artistStatement?.length || 0,
      skillsCount: profile.skills.length,
      interestsCount: profile.interests.length,
      queryParamsCount:
        profile.locations.length +
        profile.opportunityTypes.length +
        profile.amountRanges.length +
        profile.themes.length,
      hasMediums: profile.mediums.length > 0 && !profile.mediums.includes('other'),
    };

    // Calculate completeness score (0-100)
    let score = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Bio (15 points)
    if (metrics.bioLength >= 100) {
      score += 15;
      strengths.push('Comprehensive biography');
    } else if (metrics.bioLength > 0) {
      score += Math.floor((metrics.bioLength / 100) * 15);
      weaknesses.push('Biography could be more detailed');
    } else {
      weaknesses.push('Biography is missing');
    }

    // Artist Statement (25 points)
    if (metrics.statementLength >= 200) {
      score += 25;
      strengths.push('Well-articulated artist statement');
    } else if (metrics.statementLength > 0) {
      score += Math.floor((metrics.statementLength / 200) * 25);
      weaknesses.push('Artist statement needs more depth');
    } else {
      weaknesses.push('Artist statement is missing');
    }

    // Skills (15 points)
    if (metrics.skillsCount >= 3) {
      score += 15;
      strengths.push(`${metrics.skillsCount} skills documented`);
    } else if (metrics.skillsCount > 0) {
      score += Math.floor((metrics.skillsCount / 3) * 15);
      weaknesses.push('Add more skills to strengthen profile');
    } else {
      weaknesses.push('No skills listed');
    }

    // Interests (15 points)
    if (metrics.interestsCount >= 3) {
      score += 15;
      strengths.push(`${metrics.interestsCount} interest areas defined`);
    } else if (metrics.interestsCount > 0) {
      score += Math.floor((metrics.interestsCount / 3) * 15);
      weaknesses.push('Add more interests to improve matching');
    } else {
      weaknesses.push('No interests specified');
    }

    // Mediums (10 points)
    if (metrics.hasMediums) {
      score += 10;
      strengths.push('Art mediums clearly specified');
    } else {
      weaknesses.push('Specify your art mediums');
    }

    // Query Parameters (20 points)
    if (metrics.queryParamsCount >= 8) {
      score += 20;
      strengths.push('Query parameters well-configured');
    } else if (metrics.queryParamsCount > 0) {
      score += Math.floor((metrics.queryParamsCount / 8) * 20);
      weaknesses.push('Configure more query parameters for better search results');
    } else {
      weaknesses.push('Query parameters not configured');
    }

    // Generate recommendations
    const recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      area: string;
      message: string;
      action: string;
    }> = [];

    if (metrics.bioLength < 100) {
      recommendations.push({
        priority: metrics.bioLength === 0 ? 'high' : 'medium',
        area: 'Biography',
        message: 'A comprehensive biography helps opportunities understand your background',
        action: metrics.bioLength === 0
          ? 'Add a biography (minimum 100 characters recommended)'
          : `Expand your biography (current: ${metrics.bioLength} chars, recommended: 100+)`,
      });
    }

    if (metrics.statementLength < 200) {
      recommendations.push({
        priority: metrics.statementLength === 0 ? 'high' : 'medium',
        area: 'Artist Statement',
        message: 'Your artist statement is the core of profile matching',
        action: metrics.statementLength === 0
          ? 'Write an artist statement (minimum 200 characters recommended)'
          : `Enhance your artist statement (current: ${metrics.statementLength} chars, recommended: 200+)`,
      });
    }

    if (metrics.skillsCount < 3) {
      recommendations.push({
        priority: metrics.skillsCount === 0 ? 'high' : 'medium',
        area: 'Skills',
        message: 'Skills help identify relevant technical opportunities',
        action: `Add ${3 - metrics.skillsCount} more skill${3 - metrics.skillsCount > 1 ? 's' : ''} to your profile`,
      });
    }

    if (metrics.interestsCount < 3) {
      recommendations.push({
        priority: metrics.interestsCount === 0 ? 'high' : 'medium',
        area: 'Interests',
        message: 'Interests improve semantic matching with opportunities',
        action: `Add ${3 - metrics.interestsCount} more interest${3 - metrics.interestsCount > 1 ? 's' : ''} to your profile`,
      });
    }

    if (!metrics.hasMediums) {
      recommendations.push({
        priority: 'medium',
        area: 'Mediums',
        message: 'Specifying your art mediums helps with category matching',
        action: 'Select the mediums you work with',
      });
    }

    if (metrics.queryParamsCount < 8) {
      recommendations.push({
        priority: 'medium',
        area: 'Query Parameters',
        message: 'Query parameters enable targeted opportunity discovery',
        action: 'Configure locations, opportunity types, amount ranges, and themes',
      });
    }

    // Sort recommendations by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    this.logger.log(`Profile analysis completed: ${score}/100 (${strengths.length} strengths, ${weaknesses.length} weaknesses)`);

    return {
      profileId,
      completenessScore: Math.min(100, score),
      strengths,
      weaknesses,
      recommendations,
      metrics: {
        bioLength: metrics.bioLength,
        statementLength: metrics.statementLength,
        skillsCount: metrics.skillsCount,
        interestsCount: metrics.interestsCount,
        queryParamsCount: metrics.queryParamsCount,
      },
      analyzedAt: new Date().toISOString(),
    };
  }
}