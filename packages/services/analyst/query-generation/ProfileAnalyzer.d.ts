import { ArtistProfile } from './QueryGeneratorService';
export interface ProfileAnalysis {
    primaryMediums: string[];
    secondaryMediums: string[];
    coreSkills: string[];
    supportingSkills: string[];
    primaryInterests: string[];
    geographicScope: {
        city?: string;
        state?: string;
        country?: string;
        region?: string;
        isRemoteEligible: boolean;
    };
    experienceLevel: {
        category: 'beginner' | 'intermediate' | 'advanced' | 'professional';
        yearsEstimate?: number;
        keywords: string[];
    };
    searchableKeywords: string[];
    excludeKeywords: string[];
    opportunityTypes: string[];
    fundingPreferences: string[];
}
export declare class ProfileAnalyzer {
    private mediumAliases;
    private skillCategories;
    private locationParser;
    constructor();
    analyzeProfile(profile: ArtistProfile): Promise<ProfileAnalysis>;
    private analyzeMediums;
    private analyzeSkills;
    private analyzeInterests;
    private analyzeExperienceLevel;
    private generateSearchableKeywords;
    private determineOpportunityTypes;
    private determineFundingPreferences;
}
