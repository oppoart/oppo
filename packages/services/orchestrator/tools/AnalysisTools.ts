import { PrismaClient } from '@prisma/client';
import { Tool } from '../types';

export class AnalysisTools {
  constructor(private prisma: PrismaClient) {}

  getTools(): Tool[] {
    return [
      {
        name: 'summarize_opportunity',
        description: 'Creates a concise summary of an opportunity with key details',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Opportunity ID to summarize',
            required: true
          },
          {
            name: 'include_tips',
            type: 'boolean',
            description: 'Whether to include application tips',
            required: false,
            default: true
          }
        ],
        handler: async (params) => {
          const opportunity = await this.prisma.opportunity.findUnique({
            where: { id: params.id }
          });

          if (!opportunity) {
            throw new Error(`Opportunity not found: ${params.id}`);
          }

          const keyPoints = this.extractKeyPoints(opportunity.description || '');
          const applicationTips = params.include_tips 
            ? this.generateApplicationTips(opportunity)
            : [];

          const summary = {
            id: opportunity.id,
            title: opportunity.title,
            organization: opportunity.organization,
            type: opportunity.type,
            deadline: opportunity.deadline,
            applicationFee: opportunity.applicationFee,
            relevanceScore: opportunity.relevanceScore,
            status: opportunity.status,
            keyPoints,
            applicationTips,
            competitiveness: this.assessCompetitiveness(opportunity),
            fit: this.assessFit(opportunity),
            timeUntilDeadline: opportunity.deadline 
              ? Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null
          };

          return {
            summary,
            recommendation: this.generateRecommendation(summary),
            action_items: this.generateActionItems(summary)
          };
        }
      },

      {
        name: 'compare_opportunities',
        description: 'Analyzes and compares multiple opportunities for best fit',
        parameters: [
          {
            name: 'opportunityIds',
            type: 'array',
            description: 'Array of opportunity IDs to compare',
            required: true
          },
          {
            name: 'criteria',
            type: 'object',
            description: 'Comparison criteria weights',
            required: false,
            default: { relevance: 40, deadline: 20, competition: 20, fit: 20 }
          }
        ],
        handler: async (params) => {
          const opportunities = await this.prisma.opportunity.findMany({
            where: {
              id: { in: params.opportunityIds }
            }
          });

          if (opportunities.length < 2) {
            throw new Error('At least 2 opportunities required for comparison');
          }

          const criteria = params.criteria || { relevance: 40, deadline: 20, competition: 20, fit: 20 };
          
          const comparison = opportunities.map(opp => {
            const analysis = this.analyzeOpportunity(opp);
            const score = this.calculateWeightedScore(analysis, criteria);
            
            return {
              id: opp.id,
              title: opp.title,
              organization: opp.organization,
              ...analysis,
              weightedScore: score,
              rank: 0 // Will be set after sorting
            };
          });

          // Sort by weighted score and assign ranks
          comparison.sort((a, b) => b.weightedScore - a.weightedScore);
          comparison.forEach((item, index) => {
            item.rank = index + 1;
          });

          const insights = this.generateComparisonInsights(comparison);

          return {
            comparison,
            winner: comparison[0],
            insights,
            criteria: criteria,
            summary: `Compared ${comparison.length} opportunities. Top choice: ${comparison[0].title}`
          };
        }
      },

      {
        name: 'generate_application_strategy',
        description: 'Creates a strategic plan for applying to opportunities',
        parameters: [
          {
            name: 'opportunityIds',
            type: 'array',
            description: 'Array of opportunity IDs to create strategy for',
            required: true
          },
          {
            name: 'available_hours_per_week',
            type: 'number',
            description: 'Hours per week available for applications',
            required: false,
            default: 10
          },
          {
            name: 'prioritize_by',
            type: 'string',
            description: 'Priority factor (deadline, relevance, competition)',
            required: false,
            default: 'relevance'
          }
        ],
        handler: async (params) => {
          const opportunities = await this.prisma.opportunity.findMany({
            where: {
              id: { in: params.opportunityIds }
            }
          });

          const hoursPerWeek = params.available_hours_per_week || 10;
          const prioritizeBy = params.prioritize_by || 'relevance';

          const strategicPlan = opportunities.map(opp => {
            const timeEstimate = this.estimateApplicationTime(opp);
            const urgency = this.calculateUrgency(opp);
            const priority = this.calculatePriority(opp, prioritizeBy);
            
            return {
              opportunity: {
                id: opp.id,
                title: opp.title,
                organization: opp.organization,
                deadline: opp.deadline,
                relevanceScore: opp.relevanceScore
              },
              timeEstimate,
              urgency,
              priority,
              recommendedStartDate: this.calculateStartDate(opp, timeEstimate),
              tasks: this.generateApplicationTasks(opp),
              resources: this.identifyRequiredResources(opp)
            };
          });

          // Sort by priority
          strategicPlan.sort((a, b) => b.priority - a.priority);

          const timeline = this.createApplicationTimeline(strategicPlan, hoursPerWeek);
          const workload = this.calculateWorkload(strategicPlan, hoursPerWeek);

          return {
            strategy: strategicPlan,
            timeline,
            workload,
            recommendations: this.generateStrategyRecommendations(strategicPlan, workload),
            summary: `Created strategy for ${strategicPlan.length} applications with ${hoursPerWeek}h/week capacity`
          };
        }
      },

      {
        name: 'analyze_success_patterns',
        description: 'Analyzes patterns in successful vs unsuccessful applications',
        parameters: [
          {
            name: 'months_back',
            type: 'number',
            description: 'Number of months of history to analyze',
            required: false,
            default: 12
          }
        ],
        handler: async (params) => {
          const monthsBack = params.months_back || 12;
          const cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

          const opportunities = await this.prisma.opportunity.findMany({
            where: {
              createdAt: { gte: cutoffDate }
            }
          });

          const successful = opportunities.filter(opp => 
            opp.status === 'submitted' && opp.relevanceScore && opp.relevanceScore > 70
          );
          
          const unsuccessful = opportunities.filter(opp => 
            opp.status === 'rejected' || (opp.relevanceScore && opp.relevanceScore < 50)
          );

          const patterns = {
            successful: {
              count: successful.length,
              avgRelevanceScore: this.calculateAverage(successful.map(o => o.relevanceScore || 0)),
              commonTypes: this.findMostCommon(successful.map(o => o.type || 'unknown')),
              commonOrganizations: this.findMostCommon(successful.map(o => o.organization || 'unknown')),
              avgApplicationFee: this.calculateAverage(successful.map(o => o.applicationFee || 0)),
              timePatterns: this.analyzeTimePatterns(successful)
            },
            unsuccessful: {
              count: unsuccessful.length,
              avgRelevanceScore: this.calculateAverage(unsuccessful.map(o => o.relevanceScore || 0)),
              commonTypes: this.findMostCommon(unsuccessful.map(o => o.type || 'unknown')),
              commonOrganizations: this.findMostCommon(unsuccessful.map(o => o.organization || 'unknown')),
              avgApplicationFee: this.calculateAverage(unsuccessful.map(o => o.applicationFee || 0)),
              timePatterns: this.analyzeTimePatterns(unsuccessful)
            }
          };

          const insights = this.generateSuccessInsights(patterns);
          const recommendations = this.generateImprovementRecommendations(patterns);

          return {
            patterns,
            insights,
            recommendations,
            timeframe: `Last ${monthsBack} months`,
            summary: `Analyzed ${opportunities.length} opportunities: ${successful.length} successful, ${unsuccessful.length} unsuccessful`
          };
        }
      },

      {
        name: 'predict_application_success',
        description: 'Predicts likelihood of success for an opportunity based on historical patterns',
        parameters: [
          {
            name: 'opportunityId',
            type: 'string',
            description: 'Opportunity ID to analyze',
            required: true
          }
        ],
        handler: async (params) => {
          const opportunity = await this.prisma.opportunity.findUnique({
            where: { id: params.opportunityId }
          });

          if (!opportunity) {
            throw new Error(`Opportunity not found: ${params.opportunityId}`);
          }

          // Simple prediction model based on various factors
          let successScore = 50; // Base 50%
          
          // Relevance score factor (most important)
          if (opportunity.relevanceScore) {
            successScore += (opportunity.relevanceScore - 50) * 0.6;
          }

          // Application fee factor (higher fees often correlate with success)
          if (opportunity.applicationFee) {
            if (opportunity.applicationFee === 0) {
              successScore -= 10; // Free applications often more competitive
            } else if (opportunity.applicationFee > 25) {
              successScore += 5; // Modest fee can indicate seriousness
            }
          }

          // Type factor
          const typeSuccessRates = {
            'grant': 75,
            'residency': 65,
            'exhibition': 60,
            'competition': 45
          };
          const typeRate = typeSuccessRates[opportunity.type as keyof typeof typeSuccessRates];
          if (typeRate) {
            successScore = (successScore + typeRate) / 2;
          }

          // Time factor
          const timeToDeadline = opportunity.deadline 
            ? Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          
          if (timeToDeadline) {
            if (timeToDeadline < 7) {
              successScore -= 15; // Very rushed
            } else if (timeToDeadline > 90) {
              successScore -= 5; // Too far out, might forget
            } else if (timeToDeadline >= 14 && timeToDeadline <= 45) {
              successScore += 10; // Sweet spot
            }
          }

          // Clamp to 0-100 range
          successScore = Math.max(0, Math.min(100, Math.round(successScore)));

          const confidence = this.calculatePredictionConfidence(opportunity);
          const factors = this.identifySuccessFactors(opportunity, successScore);

          return {
            opportunityId: params.opportunityId,
            successScore,
            confidence,
            interpretation: this.interpretSuccessScore(successScore),
            factors,
            recommendations: this.generatePredictionRecommendations(opportunity, successScore),
            summary: `${successScore}% predicted success rate with ${confidence}% confidence`
          };
        }
      },

      {
        name: 'generate_application_checklist',
        description: 'Creates a comprehensive checklist for applying to an opportunity',
        parameters: [
          {
            name: 'opportunityId',
            type: 'string',
            description: 'Opportunity ID to create checklist for',
            required: true
          }
        ],
        handler: async (params) => {
          const opportunity = await this.prisma.opportunity.findUnique({
            where: { id: params.opportunityId }
          });

          if (!opportunity) {
            throw new Error(`Opportunity not found: ${params.opportunityId}`);
          }

          const checklist = {
            preparation: [
              'Read application guidelines thoroughly',
              'Check eligibility requirements',
              'Note all required documents',
              'Verify deadline and submission method',
              opportunity.applicationFee ? `Prepare application fee: $${opportunity.applicationFee}` : null
            ].filter(Boolean),
            
            documents: [
              'Artist statement',
              'CV/Resume',
              'Work samples/Portfolio',
              'Project proposal (if required)',
              'Letters of recommendation',
              'Budget (if grant application)',
              'Timeline (if project-based)'
            ],

            research: [
              `Research ${opportunity.organization || 'the organization'}`,
              'Review past recipients/winners',
              'Understand their mission and values',
              'Check recent exhibitions/projects',
              'Network connections to organization'
            ],

            application: [
              'Complete application form',
              'Write tailored cover letter',
              'Customize artist statement',
              'Select best work samples',
              'Proofread all materials',
              'Get feedback from peers',
              'Submit before deadline'
            ],

            followUp: [
              'Save confirmation receipt',
              'Add to tracking system',
              'Note expected response timeline',
              'Plan follow-up if appropriate'
            ]
          };

          const timeline = this.generateChecklistTimeline(opportunity, checklist);
          const tips = this.generateApplicationTips(opportunity);

          return {
            checklist,
            timeline,
            tips,
            estimatedHours: this.estimateApplicationTime(opportunity),
            priority: opportunity.relevanceScore || 50,
            summary: `Complete checklist for ${opportunity.title} application`
          };
        }
      }
    ];
  }

  // Private Helper Methods

  private extractKeyPoints(description: string): string[] {
    if (!description) return [];
    
    const sentences = description
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 20)
      .map(s => s.trim())
      .slice(0, 5);
    
    return sentences;
  }

  private generateApplicationTips(opportunity: any): string[] {
    const tips = [];
    
    if (opportunity.applicationFee && opportunity.applicationFee > 0) {
      tips.push(`Application fee required: $${opportunity.applicationFee}`);
    }
    
    if (opportunity.deadline) {
      const daysUntil = Math.ceil(
        (new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntil <= 7) {
        tips.push('⚠️ URGENT: Deadline within a week - prioritize this application');
      } else if (daysUntil <= 14) {
        tips.push('⏰ Deadline approaching - start preparation soon');
      } else if (daysUntil <= 30) {
        tips.push('📅 Good timing - begin application process');
      } else {
        tips.push('⏳ Early stage - monitor and prepare materials');
      }
    }
    
    if (opportunity.relevanceScore && opportunity.relevanceScore > 80) {
      tips.push('🎯 High relevance match - prioritize this application');
    } else if (opportunity.relevanceScore && opportunity.relevanceScore < 50) {
      tips.push('⚖️ Lower fit - consider carefully before applying');
    }
    
    if (opportunity.type === 'grant') {
      tips.push('💰 Grant application - prepare detailed budget and timeline');
    } else if (opportunity.type === 'residency') {
      tips.push('🏠 Residency - emphasize project development and community engagement');
    } else if (opportunity.type === 'exhibition') {
      tips.push('🖼️ Exhibition opportunity - focus on curatorial fit and presentation');
    }
    
    return tips.slice(0, 6); // Limit to 6 tips
  }

  private assessCompetitiveness(opportunity: any): number {
    let score = 50; // baseline
    
    if (opportunity.applicationFee === 0) {
      score += 20; // Free applications often more competitive
    } else if (opportunity.applicationFee && opportunity.applicationFee > 50) {
      score -= 10; // Higher fees may deter some applicants
    }
    
    if (opportunity.organization) {
      if (opportunity.organization.toLowerCase().includes('foundation')) {
        score += 15; // Foundations tend to be competitive
      }
      if (opportunity.organization.toLowerCase().includes('museum')) {
        score += 10; // Museum opportunities competitive
      }
    }
    
    if (opportunity.type === 'grant') {
      score += 25; // Grants very competitive
    } else if (opportunity.type === 'residency') {
      score += 15; // Residencies competitive
    }
    
    return Math.min(score, 100);
  }

  private assessFit(opportunity: any): number {
    return opportunity.relevanceScore || 50;
  }

  private analyzeOpportunity(opportunity: any) {
    return {
      relevanceScore: opportunity.relevanceScore || 50,
      competitiveness: this.assessCompetitiveness(opportunity),
      fit: this.assessFit(opportunity),
      urgency: this.calculateUrgency(opportunity),
      timeToDeadline: opportunity.deadline 
        ? Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null
    };
  }

  private calculateWeightedScore(analysis: any, criteria: any): number {
    const totalWeight = Object.values(criteria).reduce((sum: number, weight: any) => sum + weight, 0);
    
    let score = 0;
    if (criteria.relevance) score += (analysis.relevanceScore / 100) * criteria.relevance;
    if (criteria.deadline) score += (analysis.urgency / 100) * criteria.deadline;
    if (criteria.competition) score += ((100 - analysis.competitiveness) / 100) * criteria.competition;
    if (criteria.fit) score += (analysis.fit / 100) * criteria.fit;
    
    return Math.round((score / totalWeight) * 100);
  }

  private generateComparisonInsights(comparison: any[]): string[] {
    const insights = [];
    
    const winner = comparison[0];
    const runnerUp = comparison[1];
    
    insights.push(`${winner.title} ranks #1 with a score of ${winner.weightedScore}`);
    
    if (runnerUp) {
      const gap = winner.weightedScore - runnerUp.weightedScore;
      if (gap < 10) {
        insights.push(`Close race with ${runnerUp.title} (${gap} point difference)`);
      } else {
        insights.push(`Clear winner - ${gap} points ahead of ${runnerUp.title}`);
      }
    }
    
    const highestRelevance = comparison.reduce((max, item) => 
      item.relevanceScore > max.relevanceScore ? item : max
    );
    
    if (highestRelevance.id !== winner.id) {
      insights.push(`${highestRelevance.title} has highest relevance (${highestRelevance.relevanceScore}) but other factors affected ranking`);
    }
    
    return insights;
  }

  private calculateUrgency(opportunity: any): number {
    if (!opportunity.deadline) return 0;
    
    const daysUntil = Math.ceil(
      (new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntil <= 0) return 100; // Overdue
    if (daysUntil <= 7) return 90;  // Very urgent
    if (daysUntil <= 14) return 70; // Urgent
    if (daysUntil <= 30) return 50; // Moderate
    if (daysUntil <= 60) return 30; // Low urgency
    return 10; // Very low urgency
  }

  private calculatePriority(opportunity: any, prioritizeBy: string): number {
    switch (prioritizeBy) {
      case 'deadline':
        return this.calculateUrgency(opportunity);
      case 'relevance':
        return opportunity.relevanceScore || 50;
      case 'competition':
        return 100 - this.assessCompetitiveness(opportunity);
      default:
        return opportunity.relevanceScore || 50;
    }
  }

  private estimateApplicationTime(opportunity: any): number {
    let hours = 8; // Base time
    
    if (opportunity.type === 'grant') {
      hours += 6; // Grants need more detailed proposals
    } else if (opportunity.type === 'residency') {
      hours += 4; // Residencies need project descriptions
    }
    
    if (opportunity.applicationFee && opportunity.applicationFee > 0) {
      hours += 1; // Fee applications often more detailed
    }
    
    return hours;
  }

  private calculateStartDate(opportunity: any, timeEstimate: number): Date | null {
    if (!opportunity.deadline) return null;
    
    const buffer = 3; // 3 days buffer
    const startDate = new Date(opportunity.deadline);
    startDate.setDate(startDate.getDate() - Math.ceil(timeEstimate / 2) - buffer);
    
    return startDate;
  }

  private generateApplicationTasks(opportunity: any): string[] {
    const tasks = [
      'Research organization and past recipients',
      'Review application requirements',
      'Prepare artist statement',
      'Select and prepare work samples',
      'Write project proposal (if required)',
      'Gather supporting documents',
      'Complete application form',
      'Review and submit application'
    ];
    
    if (opportunity.applicationFee && opportunity.applicationFee > 0) {
      tasks.splice(-1, 0, `Prepare payment for $${opportunity.applicationFee} fee`);
    }
    
    return tasks;
  }

  private identifyRequiredResources(opportunity: any): string[] {
    const resources = [
      'Current CV/Resume',
      'Artist statement',
      'Digital portfolio/work samples',
      'Professional references'
    ];
    
    if (opportunity.type === 'grant') {
      resources.push('Project budget', 'Timeline/schedule');
    }
    
    if (opportunity.type === 'residency') {
      resources.push('Project description', 'Community engagement plan');
    }
    
    return resources;
  }

  private createApplicationTimeline(strategicPlan: any[], hoursPerWeek: number): any {
    const timeline = [];
    let currentWeek = 1;
    let remainingHours = hoursPerWeek;
    
    for (const plan of strategicPlan) {
      const timeNeeded = plan.timeEstimate;
      
      if (timeNeeded <= remainingHours) {
        timeline.push({
          week: currentWeek,
          opportunity: plan.opportunity.title,
          hours: timeNeeded,
          type: 'complete'
        });
        remainingHours -= timeNeeded;
      } else {
        // Split across weeks
        let hoursLeft = timeNeeded;
        while (hoursLeft > 0) {
          const hoursThisWeek = Math.min(hoursLeft, remainingHours || hoursPerWeek);
          timeline.push({
            week: currentWeek,
            opportunity: plan.opportunity.title,
            hours: hoursThisWeek,
            type: hoursLeft === timeNeeded ? 'start' : (hoursThisWeek >= hoursLeft ? 'complete' : 'continue')
          });
          
          hoursLeft -= hoursThisWeek;
          remainingHours -= hoursThisWeek;
          
          if (remainingHours <= 0) {
            currentWeek++;
            remainingHours = hoursPerWeek;
          }
        }
      }
      
      if (remainingHours === hoursPerWeek) {
        currentWeek++;
        remainingHours = hoursPerWeek;
      }
    }
    
    return timeline;
  }

  private calculateWorkload(strategicPlan: any[], hoursPerWeek: number): any {
    const totalHours = strategicPlan.reduce((sum, plan) => sum + plan.timeEstimate, 0);
    const weeks = Math.ceil(totalHours / hoursPerWeek);
    
    return {
      totalHours,
      weeksNeeded: weeks,
      hoursPerWeek,
      utilizationRate: Math.min(totalHours / (weeks * hoursPerWeek) * 100, 100),
      overloaded: totalHours > (weeks * hoursPerWeek)
    };
  }

  private generateStrategyRecommendations(strategicPlan: any[], workload: any): string[] {
    const recommendations = [];
    
    if (workload.overloaded) {
      recommendations.push('⚠️ Workload exceeds capacity - consider reducing number of applications');
    }
    
    if (workload.utilizationRate < 70) {
      recommendations.push('💡 You have spare capacity - consider additional applications');
    }
    
    const urgentApps = strategicPlan.filter(p => p.urgency > 70);
    if (urgentApps.length > 2) {
      recommendations.push('🚨 Multiple urgent deadlines - prioritize ruthlessly');
    }
    
    const highRel = strategicPlan.filter(p => p.opportunity.relevanceScore > 80);
    if (highRel.length > 0) {
      recommendations.push(`🎯 Focus extra effort on ${highRel.length} high-relevance opportunities`);
    }
    
    return recommendations;
  }

  // Additional helper methods for success pattern analysis

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length * 100) / 100;
  }

  private findMostCommon(items: string[]): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    items.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    
    // Return top 3
    return Object.fromEntries(
      Object.entries(counts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
    );
  }

  private analyzeTimePatterns(opportunities: any[]): any {
    const months = opportunities.map(opp => new Date(opp.createdAt).getMonth());
    const monthCounts = Array(12).fill(0);
    months.forEach(month => monthCounts[month]++);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const peak = monthCounts.indexOf(Math.max(...monthCounts));
    
    return {
      monthlyDistribution: Object.fromEntries(
        monthNames.map((name, i) => [name, monthCounts[i]])
      ),
      peakMonth: monthNames[peak]
    };
  }

  private generateSuccessInsights(patterns: any): string[] {
    const insights = [];
    const { successful, unsuccessful } = patterns;
    
    if (successful.avgRelevanceScore > unsuccessful.avgRelevanceScore + 10) {
      insights.push(`Higher relevance scores strongly correlate with success (${successful.avgRelevanceScore} vs ${unsuccessful.avgRelevanceScore})`);
    }
    
    const successfulTypes = Object.keys(successful.commonTypes);
    const unsuccessfulTypes = Object.keys(unsuccessful.commonTypes);
    
    const betterTypes = successfulTypes.filter(type => 
      (successful.commonTypes[type] || 0) > (unsuccessful.commonTypes[type] || 0)
    );
    
    if (betterTypes.length > 0) {
      insights.push(`Focus on these opportunity types: ${betterTypes.join(', ')}`);
    }
    
    if (successful.avgApplicationFee < unsuccessful.avgApplicationFee) {
      insights.push('Lower or no application fees correlate with better success rates');
    }
    
    return insights;
  }

  private generateImprovementRecommendations(patterns: any): string[] {
    const recommendations = [];
    const { successful, unsuccessful } = patterns;
    
    if (unsuccessful.count > successful.count * 2) {
      recommendations.push('Consider being more selective - apply to fewer, higher-quality matches');
    }
    
    if (successful.avgRelevanceScore > 70) {
      recommendations.push(`Target opportunities with relevance scores above ${Math.round(successful.avgRelevanceScore)}`);
    }
    
    const topSuccessfulType = Object.entries(successful.commonTypes)[0];
    if (topSuccessfulType) {
      recommendations.push(`Continue focusing on ${topSuccessfulType[0]} opportunities`);
    }
    
    return recommendations;
  }

  private calculatePredictionConfidence(opportunity: any): number {
    let confidence = 60; // Base confidence
    
    if (opportunity.relevanceScore) confidence += 20;
    if (opportunity.deadline) confidence += 10;
    if (opportunity.type) confidence += 5;
    if (opportunity.organization) confidence += 5;
    
    return Math.min(confidence, 95); // Cap at 95%
  }

  private identifySuccessFactors(opportunity: any, successScore: number): any {
    const factors = {
      positive: [],
      negative: [],
      neutral: []
    };
    
    if (opportunity.relevanceScore && opportunity.relevanceScore > 70) {
      factors.positive.push(`High relevance score (${opportunity.relevanceScore})`);
    } else if (opportunity.relevanceScore && opportunity.relevanceScore < 50) {
      factors.negative.push(`Low relevance score (${opportunity.relevanceScore})`);
    }
    
    const timeToDeadline = opportunity.deadline 
      ? Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    
    if (timeToDeadline) {
      if (timeToDeadline < 7) {
        factors.negative.push('Very tight deadline - rushed application');
      } else if (timeToDeadline >= 14 && timeToDeadline <= 45) {
        factors.positive.push('Good timing for thorough application');
      }
    }
    
    if (opportunity.type === 'grant') {
      factors.positive.push('Grant opportunities have good success rates');
    }
    
    return factors;
  }

  private interpretSuccessScore(score: number): string {
    if (score >= 80) return 'Very High - Excellent match, strongly recommended';
    if (score >= 65) return 'High - Good candidate for application';
    if (score >= 50) return 'Moderate - Proceed with careful consideration';
    if (score >= 35) return 'Low - May not be worth the effort';
    return 'Very Low - Not recommended unless circumstances change';
  }

  private generatePredictionRecommendations(opportunity: any, successScore: number): string[] {
    const recommendations = [];
    
    if (successScore >= 70) {
      recommendations.push('Strong candidate - prioritize this application');
      recommendations.push('Invest extra time in crafting a standout application');
    } else if (successScore >= 50) {
      recommendations.push('Moderate potential - apply if you have capacity');
      recommendations.push('Focus on highlighting your strongest relevant work');
    } else {
      recommendations.push('Consider whether this is the best use of your time');
      recommendations.push('Look for ways to improve your fit for this type of opportunity');
    }
    
    if (opportunity.deadline) {
      const timeToDeadline = Math.ceil(
        (new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (timeToDeadline < 14) {
        recommendations.push('Tight timeline - ensure you can submit a quality application');
      }
    }
    
    return recommendations;
  }

  private generateChecklistTimeline(opportunity: any, checklist: any): any {
    const totalDays = opportunity.deadline 
      ? Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 30;
    
    const timeline = {
      'Week 1': ['preparation', 'research'],
      'Week 2': ['documents'],
      'Week 3': ['application'],
      'Final Days': ['followUp']
    };
    
    if (totalDays < 14) {
      // Compressed timeline
      return {
        'Days 1-3': ['preparation', 'research'],
        'Days 4-7': ['documents', 'application'],
        'Final Days': ['followUp']
      };
    }
    
    return timeline;
  }

  private generateRecommendation(summary: any): string {
    const score = summary.fit;
    const timeLeft = summary.timeUntilDeadline;
    
    if (score >= 80) {
      return timeLeft && timeLeft < 14 
        ? 'High priority - start immediately despite tight deadline'
        : 'Excellent match - prioritize this application';
    } else if (score >= 60) {
      return 'Good candidate - apply if you have capacity';
    } else {
      return 'Consider carefully - may not be the best use of time';
    }
  }

  private generateActionItems(summary: any): string[] {
    const items = [];
    
    if (summary.timeUntilDeadline && summary.timeUntilDeadline < 7) {
      items.push('🚨 URGENT: Begin application process immediately');
    } else if (summary.timeUntilDeadline && summary.timeUntilDeadline < 14) {
      items.push('⏰ Start application preparation this week');
    }
    
    if (summary.relevanceScore > 80) {
      items.push('🎯 High match - invest extra time in application quality');
    }
    
    if (summary.applicationFee) {
      items.push(`💰 Budget for $${summary.applicationFee} application fee`);
    }
    
    items.push('📋 Review complete application requirements');
    items.push('📂 Gather all required supporting documents');
    
    return items;
  }
}