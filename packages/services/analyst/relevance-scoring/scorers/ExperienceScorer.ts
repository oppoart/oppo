import { ArtistProfile } from '@prisma/client';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';

export class ExperienceScorer {
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async calculateScore(profile: ArtistProfile, opportunity: OpportunityData): Promise<number> {
    if (!this.isInitialized) throw new Error('ExperienceScorer not initialized');

    const opportunityText = (opportunity.title + ' ' + opportunity.description).toLowerCase();
    const profileExperience = (profile.experience || '').toLowerCase();

    // Experience level matching
    const beginnerTerms = ['beginner', 'new', 'emerging', 'student', 'first time'];
    const intermediateTerms = ['intermediate', 'developing', 'some experience'];
    const advancedTerms = ['advanced', 'professional', 'established', 'experienced', 'expert'];

    let profileLevel = 'intermediate'; // default
    if (beginnerTerms.some(term => profileExperience.includes(term))) profileLevel = 'beginner';
    if (advancedTerms.some(term => profileExperience.includes(term))) profileLevel = 'advanced';

    let opportunityLevel = 'any'; // default
    if (beginnerTerms.some(term => opportunityText.includes(term))) opportunityLevel = 'beginner';
    if (advancedTerms.some(term => opportunityText.includes(term))) opportunityLevel = 'advanced';

    // Scoring logic
    if (opportunityLevel === 'any') return 0.8; // Open to all levels
    if (profileLevel === opportunityLevel) return 1.0; // Perfect match
    if (profileLevel === 'intermediate') return 0.7; // Intermediate can often apply to most
    
    return 0.4; // Mismatch
  }

  async healthCheck(): Promise<boolean> {
    return this.isInitialized;
  }

  async shutdown(): Promise<void> {
    this.isInitialized = false;
  }
}