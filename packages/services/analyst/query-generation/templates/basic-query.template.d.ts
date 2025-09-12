import { GeneratedSearchQuery, SourceType } from '../../../../../apps/backend/src/types/discovery';
export declare class BasicQueryTemplate {
    private isInitialized;
    initialize(): Promise<void>;
    generateQueries(profileAnalysis: any, sourceType: SourceType, maxQueries: number): Promise<GeneratedSearchQuery[]>;
}
//# sourceMappingURL=basic-query.template.d.ts.map