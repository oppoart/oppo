import { ArtistProfile } from '@prisma/client';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';

export class LocationScorer {
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async calculateScore(profile: ArtistProfile, opportunity: OpportunityData): Promise<number> {
    if (!this.isInitialized) throw new Error('LocationScorer not initialized');

    // If no location info, return neutral score
    if (!profile.location && !opportunity.location) return 0.5;
    if (!profile.location || !opportunity.location) return 0.7; // One missing, assume possible

    // Simple location matching
    const profileLocation = profile.location.toLowerCase();
    const opportunityLocation = opportunity.location.toLowerCase();

    if (profileLocation === opportunityLocation) return 1.0;
    if (opportunityLocation.includes(profileLocation) || profileLocation.includes(opportunityLocation)) return 0.8;
    if (opportunityLocation.includes('remote') || opportunityLocation.includes('online')) return 0.9;

    return 0.3; // Different locations
  }

  async healthCheck(): Promise<boolean> {
    return this.isInitialized;
  }

  async shutdown(): Promise<void> {
    this.isInitialized = false;
  }
}