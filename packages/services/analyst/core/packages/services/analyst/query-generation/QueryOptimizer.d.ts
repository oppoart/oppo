import { GeneratedSearchQuery } from './types';
export declare class QueryOptimizer {
    private isInitialized;
    initialize(): Promise<void>;
    optimizeQueries(queries: GeneratedSearchQuery[], profileAnalysis: any, maxQueries?: number): Promise<GeneratedSearchQuery[]>;
    private removeDuplicates;
}
