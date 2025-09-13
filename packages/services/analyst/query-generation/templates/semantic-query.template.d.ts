import { GeneratedSearchQuery, SourceType } from '../types';
export declare class SemanticQueryTemplate {
    private aiProvider;
    private isInitialized;
    private openai;
    constructor(aiProvider?: 'openai' | 'anthropic' | 'google');
    initialize(): Promise<void>;
    generateQueries(aiContext: any, sourceType: SourceType, maxQueries: number): Promise<GeneratedSearchQuery[]>;
    private generateOpenAIQueries;
    private generateMockSemanticQueries;
    private generateFallbackQueries;
    shutdown(): Promise<void>;
}
