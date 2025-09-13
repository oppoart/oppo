import { GeneratedSearchQuery, SourceType } from '../types';

export class BasicQueryTemplate {
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async generateQueries(
    profileAnalysis: any,
    sourceType: SourceType,
    maxQueries: number
  ): Promise<GeneratedSearchQuery[]> {
    if (!this.isInitialized) {
      throw new Error('BasicQueryTemplate is not initialized');
    }

    const queries: GeneratedSearchQuery[] = [];
    const { 
      primaryMediums, 
      coreSkills, 
      primaryInterests, 
      geographicScope, 
      opportunityTypes,
      fundingPreferences,
      experienceLevel 
    } = profileAnalysis;

    // 🎯 OPPORTUNITY TYPE-DRIVEN QUERIES (NEW!)
    // Generate queries based on the sophisticated opportunity analysis
    for (const opportunityType of (opportunityTypes || []).slice(0, 3)) {
      for (const medium of primaryMediums.slice(0, 2)) {
        queries.push({
          query: `${medium} ${opportunityType} ${new Date().getFullYear()}`,
          provider: sourceType,
          priority: 9, // Higher priority for opportunity-driven queries
          context: { artistMediums: [medium], interests: [], opportunityType },
          expectedResults: 25
        });
      }
    }

    // 💰 FUNDING PREFERENCE-DRIVEN QUERIES (NEW!)
    for (const fundingPref of (fundingPreferences || []).slice(0, 2)) {
      for (const medium of primaryMediums.slice(0, 1)) {
        queries.push({
          query: `${medium} ${fundingPref} ${experienceLevel?.category || 'artist'}`,
          provider: sourceType,
          priority: 8,
          context: { artistMediums: [medium], interests: [], fundingType: fundingPref },
          expectedResults: 20
        });
      }
    }

    // 🎨 MEDIUM + OPPORTUNITY TYPE COMBINATIONS (ENHANCED)
    for (const medium of primaryMediums.slice(0, 2)) {
      const topOpportunityType = opportunityTypes?.[0] || 'opportunities';
      queries.push({
        query: `${medium} ${topOpportunityType} call for artists`,
        provider: sourceType,
        priority: 7,
        context: { artistMediums: [medium], interests: [], opportunityType: topOpportunityType },
        expectedResults: 18
      });
    }

    // 🏆 EXPERIENCE-LEVEL TARGETED QUERIES (NEW!)
    if (experienceLevel?.category) {
      const experienceKeywords = experienceLevel.keywords || [];
      for (const keyword of experienceKeywords.slice(0, 1)) {
        queries.push({
          query: `${keyword} artist ${opportunityTypes?.[0] || 'opportunities'} ${primaryMediums[0] || 'art'}`,
          provider: sourceType,
          priority: 7,
          context: { 
            artistMediums: primaryMediums, 
            interests: [], 
            experienceLevel: experienceLevel.category,
            keyword 
          },
          expectedResults: 15
        });
      }
    }

    // 🌍 LOCATION + OPPORTUNITY TYPE QUERIES (ENHANCED)
    if (geographicScope?.city && opportunityTypes?.length > 0) {
      queries.push({
        query: `${opportunityTypes[0]} ${geographicScope.city} ${primaryMediums[0] || 'artists'}`,
        provider: sourceType,
        priority: 6,
        context: { 
          artistMediums: primaryMediums, 
          interests: [], 
          location: geographicScope.city,
          opportunityType: opportunityTypes[0]
        },
        expectedResults: 12
      });
    }

    // 💡 INTEREST + OPPORTUNITY COMBINATIONS (ENHANCED)
    if (primaryInterests.length > 0 && opportunityTypes?.length > 0) {
      queries.push({
        query: `${primaryInterests[0]} ${opportunityTypes[1] || opportunityTypes[0]} ${primaryMediums[0] || 'art'}`,
        provider: sourceType,
        priority: 6,
        context: { 
          artistMediums: primaryMediums, 
          interests: primaryInterests,
          opportunityType: opportunityTypes[1] || opportunityTypes[0]
        },
        expectedResults: 10
      });
    }

    return queries.slice(0, maxQueries);
  }
}