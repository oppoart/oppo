import { ScoringWeights } from '../RelevanceScoringEngine';
export declare class WeightedScoreAggregator {
    private weights;
    private isInitialized;
    constructor(weights: ScoringWeights);
    initialize(): Promise<void>;
    aggregateScores(componentScores: {
        semantic: number;
        keyword: number;
        category: number;
        location: number;
        experience: number;
        deadline: number;
    }): number;
    updateWeights(newWeights: ScoringWeights): void;
    getWeights(): ScoringWeights;
}
//# sourceMappingURL=WeightedScoreAggregator.d.ts.map