import { GeneratedSearchQuery } from '../../../../apps/backend/src/types/discovery';
export declare class QueryOptimizer {
    private isInitialized;
    initialize(): Promise<void>;
    optimizeQueries(queries: GeneratedSearchQuery[], profileAnalysis: any, maxQueries?: number): Promise<GeneratedSearchQuery[]>;
    private removeDuplicates;
}
//# sourceMappingURL=QueryOptimizer.d.ts.map