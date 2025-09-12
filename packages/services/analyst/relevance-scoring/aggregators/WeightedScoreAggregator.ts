import { ScoringWeights } from '../RelevanceScoringEngine';

export class WeightedScoreAggregator {
  private weights: ScoringWeights;
  private isInitialized: boolean = false;

  constructor(weights: ScoringWeights) {
    this.weights = weights;
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  aggregateScores(componentScores: {
    semantic: number;
    keyword: number;
    category: number;
    location: number;
    experience: number;
    deadline: number;
  }): number {
    if (!this.isInitialized) throw new Error('WeightedScoreAggregator not initialized');

    const weightedSum = 
      componentScores.semantic * this.weights.semantic +
      componentScores.keyword * this.weights.keyword +
      componentScores.category * this.weights.category +
      componentScores.location * this.weights.location +
      componentScores.experience * this.weights.experience +
      componentScores.deadline * this.weights.deadline;

    const totalWeight = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  updateWeights(newWeights: ScoringWeights): void {
    this.weights = newWeights;
  }

  getWeights(): ScoringWeights {
    return { ...this.weights };
  }
}