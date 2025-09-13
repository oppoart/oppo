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
    initialize(): Promise<void>;
    buildContext(profile: ArtistProfile, analysis: ProfileAnalysis): Promise<AIContext>;
    private createProfileSummary;
    private defineSearchObjectives;
    private generateContextualHints;
    private defineConstraints;
    private buildSystemPrompt;
    private buildUserPrompt;
    private getExpectedOutputFormat;
    private truncatePrompt;
    updateConfig(config: Partial<ContextBuilderConfig>): void;
    getConfig(): ContextBuilderConfig;
    shutdown(): Promise<void>;
}
