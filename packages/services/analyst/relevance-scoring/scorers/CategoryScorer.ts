import { ArtistProfile } from '@prisma/client';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';

export class CategoryScorer {
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async calculateScore(profile: ArtistProfile, opportunity: OpportunityData): Promise<number> {
    if (!this.isInitialized) throw new Error('CategoryScorer not initialized');

    // Simple medium/category matching
    const profileMediums = profile.mediums.map(m => m.toLowerCase());
    const opportunityText = (opportunity.title + ' ' + opportunity.description + ' ' + opportunity.tags.join(' ')).toLowerCase();
    
    let matches = 0;
    for (const medium of profileMediums) {
      if (opportunityText.includes(medium)) {
        matches++;
      }
    }

    return profileMediums.length > 0 ? Math.min(1, matches / profileMediums.length) : 0.5;
  }

  async healthCheck(): Promise<boolean> {
    return this.isInitialized;
  }

  async shutdown(): Promise<void> {
    this.isInitialized = false;
  }
}