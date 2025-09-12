export interface ScoringModel {
    id: string;
    name: string;
    version: string;
    weights: Record<string, number>;
    parameters: Record<string, any>;
}
export declare class ScoringModels {
    private static models;
    static getDefaultModel(): ScoringModel;
    static registerModel(model: ScoringModel): void;
    static getModel(id: string): ScoringModel | undefined;
    static listModels(): ScoringModel[];
}
//# sourceMappingURL=ScoringModels.d.ts.map