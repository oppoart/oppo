import { GeneratedSearchQuery, SourceType } from '../types';
export declare class SemanticQueryTemplate {
    private aiProvider;
    private isInitialized;
    constructor(aiProvider?: 'openai' | 'anthropic' | 'google');
    initialize(): Promise<void>;
    generateQueries(aiContext: any, sourceType: SourceType, maxQueries: number): Promise<GeneratedSearchQuery[]>;
    private generateMockSemanticQueries;
    private generateFallbackQueries;
    shutdown(): Promise<void>;
}
