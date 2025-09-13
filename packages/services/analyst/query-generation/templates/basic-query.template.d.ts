import { GeneratedSearchQuery, SourceType } from '../types';
export declare class BasicQueryTemplate {
    private isInitialized;
    initialize(): Promise<void>;
    generateQueries(profileAnalysis: any, sourceType: SourceType, maxQueries: number): Promise<GeneratedSearchQuery[]>;
}
