import { ArtistProfile } from './QueryGeneratorService';
import { ProfileAnalysis } from './ProfileAnalyzer';
export interface AIContext {
    systemPrompt: string;
    userPrompt: string;
    profileSummary: string;
    searchObjectives: string[];
    contextualHints: string[];
    constraints: string[];
    expectedOutputFormat: string;
}
export interface ContextBuilderConfig {
    aiProvider: 'openai' | 'anthropic' | 'google';
    includePersonalInfo: boolean;
    includeGeographicInfo: boolean;
    maxPromptLength: number;
    temperature: number;
}
export declare class ContextBuilder {
    private config;
    private isInitialized;
    constructor(aiProvider?: 'openai' | 'anthropic' | 'google');
    /**
     * Initialize the context builder
     */
    initialize(): Promise<void>;
    /**
     * Build AI context for query generation based on artist profile and analysis
     */
    buildContext(profile: ArtistProfile, analysis: ProfileAnalysis): Promise<AIContext>;
    /**
     * Create a concise profile summary for AI context
     */
    private createProfileSummary;
    /**
     * Define search objectives based on profile analysis
     */
    private defineSearchObjectives;
    /**
     * Generate contextual hints to guide AI query generation
     */
    private generateContextualHints;
    /**
     * Define constraints for query generation
     */
    private defineConstraints;
    /**
     * Build the system prompt for AI query generation
     */
    private buildSystemPrompt;
    /**
     * Build the user prompt for AI query generation
     */
    private buildUserPrompt;
    /**
     * Get expected output format description
     */
    private getExpectedOutputFormat;
    /**
     * Truncate prompt if it exceeds maximum length
     */
    private truncatePrompt;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<ContextBuilderConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): ContextBuilderConfig;
    /**
     * Shutdown the context builder
     */
    shutdown(): Promise<void>;
}
