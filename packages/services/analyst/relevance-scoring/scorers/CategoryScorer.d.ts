import { ArtistProfile } from '@prisma/client';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
export declare class CategoryScorer {
    private isInitialized;
    initialize(): Promise<void>;
    calculateScore(profile: ArtistProfile, opportunity: OpportunityData): Promise<number>;
    healthCheck(): Promise<boolean>;
    shutdown(): Promise<void>;
}
