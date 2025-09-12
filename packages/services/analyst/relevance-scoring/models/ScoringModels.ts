export interface ScoringModel {
  id: string;
  name: string;
  version: string;
  weights: Record<string, number>;
  parameters: Record<string, any>;
}

export class ScoringModels {
  private static models: Map<string, ScoringModel> = new Map();

  static getDefaultModel(): ScoringModel {
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

  static registerModel(model: ScoringModel): void {
    this.models.set(model.id, model);
  }

  static getModel(id: string): ScoringModel | undefined {
    return this.models.get(id);
  }

  static listModels(): ScoringModel[] {
    return Array.from(this.models.values());
  }
}