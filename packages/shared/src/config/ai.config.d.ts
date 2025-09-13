import { AiConfig } from './types';
export declare const AI_MODELS: {
    readonly OPENAI: {
        readonly GPT4: "gpt-4";
        readonly GPT4_TURBO: "gpt-4-turbo-preview";
        readonly GPT35_TURBO: "gpt-3.5-turbo";
        readonly GPT35_TURBO_16K: "gpt-3.5-turbo-16k";
        readonly TEXT_EMBEDDING_ADA: "text-embedding-ada-002";
        readonly TEXT_EMBEDDING_3_SMALL: "text-embedding-3-small";
        readonly TEXT_EMBEDDING_3_LARGE: "text-embedding-3-large";
    };
    readonly ANTHROPIC: {
        readonly CLAUDE_3_OPUS: "claude-3-opus-20240229";
        readonly CLAUDE_3_SONNET: "claude-3-sonnet-20240229";
        readonly CLAUDE_3_HAIKU: "claude-3-haiku-20240307";
        readonly CLAUDE_2_1: "claude-2.1";
        readonly CLAUDE_2: "claude-2";
        readonly CLAUDE_INSTANT: "claude-instant-1.2";
    };
};
export declare const TOKEN_LIMITS: {
    readonly GPT4: 8192;
    readonly GPT4_TURBO: 128000;
    readonly GPT35_TURBO: 4096;
    readonly GPT35_TURBO_16K: 16384;
    readonly CLAUDE_3: 200000;
    readonly CLAUDE_2: 100000;
    readonly DEFAULT: 4096;
};
export declare const TEMPERATURE_PRESETS: {
    readonly DETERMINISTIC: 0;
    readonly FOCUSED: 0.3;
    readonly BALANCED: 0.7;
    readonly CREATIVE: 0.9;
    readonly RANDOM: 1;
};
export declare const AI_TASKS: {
    readonly OPPORTUNITY_ANALYSIS: "opportunity_analysis";
    readonly PROFILE_MATCHING: "profile_matching";
    readonly CONTENT_GENERATION: "content_generation";
    readonly QUERY_GENERATION: "query_generation";
    readonly SUMMARIZATION: "summarization";
    readonly CLASSIFICATION: "classification";
    readonly ENTITY_EXTRACTION: "entity_extraction";
    readonly SENTIMENT_ANALYSIS: "sentiment_analysis";
    readonly TRANSLATION: "translation";
    readonly EMBEDDING: "embedding";
};
export declare const AI_RATE_LIMITS: {
    readonly REQUESTS_PER_MINUTE: {
        readonly GPT4: 60;
        readonly GPT35_TURBO: 100;
        readonly CLAUDE_3: 50;
        readonly EMBEDDING: 200;
        readonly DEFAULT: 60;
    };
    readonly TOKENS_PER_MINUTE: {
        readonly GPT4: 10000;
        readonly GPT35_TURBO: 90000;
        readonly CLAUDE_3: 100000;
        readonly DEFAULT: 60000;
    };
    readonly CONCURRENT_REQUESTS: {
        readonly MAX: 10;
        readonly DEFAULT: 5;
    };
};
export declare const PROMPT_TEMPLATES: {
    readonly OPPORTUNITY_ANALYSIS: "Analyze the following opportunity for an artist with the given profile:\n\nArtist Profile:\n{profile}\n\nOpportunity:\n{opportunity}\n\nPlease provide:\n1. Relevance score (0-1)\n2. Key matching points\n3. Potential challenges\n4. Recommended action";
    readonly PROFILE_MATCHING: "Match the following artist profile with potential opportunities:\n\nProfile:\n{profile}\n\nAvailable Opportunities:\n{opportunities}\n\nRank the opportunities by relevance and explain your reasoning.";
    readonly QUERY_GENERATION: "Generate search queries to find opportunities for an artist with the following profile:\n\n{profile}\n\nGenerate {count} diverse search queries that would help find relevant grants, residencies, exhibitions, and other opportunities.";
    readonly CONTENT_SUMMARIZATION: "Summarize the following content in {max_words} words or less:\n\n{content}\n\nFocus on key information relevant to artists and creative opportunities.";
};
export declare const AI_ENDPOINTS: {
    readonly OPENAI: {
        readonly BASE_URL: "https://api.openai.com/v1";
        readonly CHAT: "/chat/completions";
        readonly COMPLETIONS: "/completions";
        readonly EMBEDDINGS: "/embeddings";
        readonly MODELS: "/models";
    };
    readonly ANTHROPIC: {
        readonly BASE_URL: "https://api.anthropic.com/v1";
        readonly MESSAGES: "/messages";
        readonly COMPLETIONS: "/complete";
    };
};
export declare const AI_ERROR_CODES: {
    readonly RATE_LIMITED: "rate_limited";
    readonly INVALID_API_KEY: "invalid_api_key";
    readonly MODEL_NOT_FOUND: "model_not_found";
    readonly CONTEXT_LENGTH_EXCEEDED: "context_length_exceeded";
    readonly SERVICE_UNAVAILABLE: "service_unavailable";
    readonly TIMEOUT: "timeout";
    readonly INVALID_REQUEST: "invalid_request";
};
export declare const AI_RETRY: {
    readonly MAX_ATTEMPTS: 3;
    readonly INITIAL_DELAY: 1000;
    readonly MAX_DELAY: 10000;
    readonly BACKOFF_MULTIPLIER: 2;
    readonly RETRY_ON_CODES: readonly [429, 500, 502, 503, 504];
};
export declare const AI_COSTS: {
    readonly GPT4: {
        readonly INPUT: 0.03;
        readonly OUTPUT: 0.06;
    };
    readonly GPT4_TURBO: {
        readonly INPUT: 0.01;
        readonly OUTPUT: 0.03;
    };
    readonly GPT35_TURBO: {
        readonly INPUT: 0.001;
        readonly OUTPUT: 0.002;
    };
    readonly CLAUDE_3_OPUS: {
        readonly INPUT: 0.015;
        readonly OUTPUT: 0.075;
    };
    readonly CLAUDE_3_SONNET: {
        readonly INPUT: 0.003;
        readonly OUTPUT: 0.015;
    };
    readonly EMBEDDING: {
        readonly ADA: 0.0001;
        readonly SMALL: 0.00002;
        readonly LARGE: 0.00013;
    };
};
export declare function createAiConfig(): AiConfig;
export declare const aiConfig: AiConfig;
