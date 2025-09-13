"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiConfig = exports.AI_COSTS = exports.AI_RETRY = exports.AI_ERROR_CODES = exports.AI_ENDPOINTS = exports.PROMPT_TEMPLATES = exports.AI_RATE_LIMITS = exports.AI_TASKS = exports.TEMPERATURE_PRESETS = exports.TOKEN_LIMITS = exports.AI_MODELS = void 0;
exports.createAiConfig = createAiConfig;
exports.AI_MODELS = {
    OPENAI: {
        GPT4: 'gpt-4',
        GPT4_TURBO: 'gpt-4-turbo-preview',
        GPT35_TURBO: 'gpt-3.5-turbo',
        GPT35_TURBO_16K: 'gpt-3.5-turbo-16k',
        TEXT_EMBEDDING_ADA: 'text-embedding-ada-002',
        TEXT_EMBEDDING_3_SMALL: 'text-embedding-3-small',
        TEXT_EMBEDDING_3_LARGE: 'text-embedding-3-large',
    },
    ANTHROPIC: {
        CLAUDE_3_OPUS: 'claude-3-opus-20240229',
        CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
        CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
        CLAUDE_2_1: 'claude-2.1',
        CLAUDE_2: 'claude-2',
        CLAUDE_INSTANT: 'claude-instant-1.2',
    },
};
exports.TOKEN_LIMITS = {
    GPT4: 8192,
    GPT4_TURBO: 128000,
    GPT35_TURBO: 4096,
    GPT35_TURBO_16K: 16384,
    CLAUDE_3: 200000,
    CLAUDE_2: 100000,
    DEFAULT: 4096,
};
exports.TEMPERATURE_PRESETS = {
    DETERMINISTIC: 0,
    FOCUSED: 0.3,
    BALANCED: 0.7,
    CREATIVE: 0.9,
    RANDOM: 1.0,
};
exports.AI_TASKS = {
    OPPORTUNITY_ANALYSIS: 'opportunity_analysis',
    PROFILE_MATCHING: 'profile_matching',
    CONTENT_GENERATION: 'content_generation',
    QUERY_GENERATION: 'query_generation',
    SUMMARIZATION: 'summarization',
    CLASSIFICATION: 'classification',
    ENTITY_EXTRACTION: 'entity_extraction',
    SENTIMENT_ANALYSIS: 'sentiment_analysis',
    TRANSLATION: 'translation',
    EMBEDDING: 'embedding',
};
exports.AI_RATE_LIMITS = {
    REQUESTS_PER_MINUTE: {
        GPT4: 60,
        GPT35_TURBO: 100,
        CLAUDE_3: 50,
        EMBEDDING: 200,
        DEFAULT: 60,
    },
    TOKENS_PER_MINUTE: {
        GPT4: 10000,
        GPT35_TURBO: 90000,
        CLAUDE_3: 100000,
        DEFAULT: 60000,
    },
    CONCURRENT_REQUESTS: {
        MAX: 10,
        DEFAULT: 5,
    },
};
exports.PROMPT_TEMPLATES = {
    OPPORTUNITY_ANALYSIS: `Analyze the following opportunity for an artist with the given profile:

Artist Profile:
{profile}

Opportunity:
{opportunity}

Please provide:
1. Relevance score (0-1)
2. Key matching points
3. Potential challenges
4. Recommended action`,
    PROFILE_MATCHING: `Match the following artist profile with potential opportunities:

Profile:
{profile}

Available Opportunities:
{opportunities}

Rank the opportunities by relevance and explain your reasoning.`,
    QUERY_GENERATION: `Generate search queries to find opportunities for an artist with the following profile:

{profile}

Generate {count} diverse search queries that would help find relevant grants, residencies, exhibitions, and other opportunities.`,
    CONTENT_SUMMARIZATION: `Summarize the following content in {max_words} words or less:

{content}

Focus on key information relevant to artists and creative opportunities.`,
};
exports.AI_ENDPOINTS = {
    OPENAI: {
        BASE_URL: 'https://api.openai.com/v1',
        CHAT: '/chat/completions',
        COMPLETIONS: '/completions',
        EMBEDDINGS: '/embeddings',
        MODELS: '/models',
    },
    ANTHROPIC: {
        BASE_URL: 'https://api.anthropic.com/v1',
        MESSAGES: '/messages',
        COMPLETIONS: '/complete',
    },
};
exports.AI_ERROR_CODES = {
    RATE_LIMITED: 'rate_limited',
    INVALID_API_KEY: 'invalid_api_key',
    MODEL_NOT_FOUND: 'model_not_found',
    CONTEXT_LENGTH_EXCEEDED: 'context_length_exceeded',
    SERVICE_UNAVAILABLE: 'service_unavailable',
    TIMEOUT: 'timeout',
    INVALID_REQUEST: 'invalid_request',
};
exports.AI_RETRY = {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 10000,
    BACKOFF_MULTIPLIER: 2,
    RETRY_ON_CODES: [429, 500, 502, 503, 504],
};
exports.AI_COSTS = {
    GPT4: {
        INPUT: 0.03,
        OUTPUT: 0.06,
    },
    GPT4_TURBO: {
        INPUT: 0.01,
        OUTPUT: 0.03,
    },
    GPT35_TURBO: {
        INPUT: 0.001,
        OUTPUT: 0.002,
    },
    CLAUDE_3_OPUS: {
        INPUT: 0.015,
        OUTPUT: 0.075,
    },
    CLAUDE_3_SONNET: {
        INPUT: 0.003,
        OUTPUT: 0.015,
    },
    EMBEDDING: {
        ADA: 0.0001,
        SMALL: 0.00002,
        LARGE: 0.00013,
    },
};
function createAiConfig() {
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!openaiKey && !anthropicKey) {
        console.warn('No AI API keys configured. AI features will be limited.');
    }
    return {
        openai: {
            apiKey: openaiKey || '',
            model: process.env.AI_MODEL_PRIMARY || exports.AI_MODELS.OPENAI.GPT4,
            maxTokens: parseInt(process.env.AI_MAX_TOKENS || String(exports.TOKEN_LIMITS.DEFAULT)),
            temperature: exports.TEMPERATURE_PRESETS.BALANCED,
        },
        anthropic: anthropicKey ? {
            apiKey: anthropicKey,
            model: exports.AI_MODELS.ANTHROPIC.CLAUDE_3_SONNET,
            maxTokens: exports.TOKEN_LIMITS.CLAUDE_3,
        } : undefined,
        fallbackModel: process.env.AI_MODEL_FALLBACK || exports.AI_MODELS.OPENAI.GPT35_TURBO,
        rateLimit: parseInt(process.env.AI_RATE_LIMIT || String(exports.AI_RATE_LIMITS.REQUESTS_PER_MINUTE.DEFAULT)),
    };
}
exports.aiConfig = createAiConfig();
//# sourceMappingURL=ai.config.js.map