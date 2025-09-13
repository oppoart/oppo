"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringModels = void 0;
class ScoringModels {
    static getDefaultModel() {
        return {
            id: 'default-v1',
            name: 'Default Scoring Model',
            version: '1.0.0',
            weights: {
                semantic: 0.35,
                keyword: 0.25,
                category: 0.20,
                location: 0.10,
                experience: 0.10,
                deadline: 0.05
            },
            parameters: {
                minThreshold: 0.3,
                boostFactor: 1.0,
                decayRate: 0.1
            }
        };
    }
    static registerModel(model) {
        this.models.set(model.id, model);
    }
    static getModel(id) {
        return this.models.get(id);
    }
    static listModels() {
        return Array.from(this.models.values());
    }
}
exports.ScoringModels = ScoringModels;
ScoringModels.models = new Map();
//# sourceMappingURL=ScoringModels.js.map