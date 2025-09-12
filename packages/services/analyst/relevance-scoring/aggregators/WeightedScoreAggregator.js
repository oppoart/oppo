"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeightedScoreAggregator = void 0;
class WeightedScoreAggregator {
    weights;
    isInitialized = false;
    constructor(weights) {
        this.weights = weights;
    }
    async initialize() {
        this.isInitialized = true;
    }
    aggregateScores(componentScores) {
        if (!this.isInitialized)
            throw new Error('WeightedScoreAggregator not initialized');
        const weightedSum = componentScores.semantic * this.weights.semantic +
            componentScores.keyword * this.weights.keyword +
            componentScores.category * this.weights.category +
            componentScores.location * this.weights.location +
            componentScores.experience * this.weights.experience +
            componentScores.deadline * this.weights.deadline;
        const totalWeight = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    updateWeights(newWeights) {
        this.weights = newWeights;
    }
    getWeights() {
        return { ...this.weights };
    }
}
exports.WeightedScoreAggregator = WeightedScoreAggregator;
//# sourceMappingURL=WeightedScoreAggregator.js.map