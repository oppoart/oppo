"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticScorer = void 0;
const discovery_1 = require("../../../../../apps/backend/src/types/discovery");
class SemanticScorer {
    constructor(aiProvider = 'openai') {
        this.embeddingCache = new Map();
        this.isInitialized = false;
        this.config = {
            aiProvider,
            embeddingModel: this.getDefaultEmbeddingModel(aiProvider),
            maxTextLength: 8000,
            useCache: true
        };
    }
    async initialize() {
        if (this.isInitialized)
            return;
        console.log(`Initializing SemanticScorer with ${this.config.aiProvider}...`);
        try {
            await this.generateEmbedding('test');
            this.isInitialized = true;
            console.log('SemanticScorer initialized successfully');
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to initialize SemanticScorer: ${error}`, this.config.aiProvider, 'embedding-initialization');
        }
    }
    async calculateScore(profile, opportunity) {
        if (!this.isInitialized) {
            throw new Error('SemanticScorer is not initialized');
        }
        try {
            const profileText = this.createProfileText(profile);
            const opportunityText = this.createOpportunityText(opportunity);
            const [profileEmbedding, opportunityEmbedding] = await Promise.all([
                this.generateEmbedding(profileText),
                this.generateEmbedding(opportunityText)
            ]);
            const similarity = this.calculateCosineSimilarity(profileEmbedding.embedding, opportunityEmbedding.embedding);
            return this.normalizeScore(similarity);
        }
        catch (error) {
            console.error(`SemanticScorer error for opportunity ${opportunity.id}:`, error);
            return this.fallbackSemanticScore(profile, opportunity);
        }
    }
    async generateEmbedding(text) {
        const startTime = Date.now();
        const truncatedText = text.length > this.config.maxTextLength ?
            text.substring(0, this.config.maxTextLength) + '...' : text;
        if (this.config.useCache) {
            const cacheKey = this.hashText(truncatedText);
            const cached = this.embeddingCache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        try {
            let embedding;
            switch (this.config.aiProvider) {
                case 'openai':
                    embedding = await this.generateOpenAIEmbedding(truncatedText);
                    break;
                case 'anthropic':
                    embedding = await this.generateFallbackEmbedding(truncatedText);
                    break;
                case 'google':
                    embedding = await this.generateGoogleEmbedding(truncatedText);
                    break;
                default:
                    throw new Error(`Unsupported AI provider: ${this.config.aiProvider}`);
            }
            const result = {
                embedding,
                text: truncatedText,
                processingTime: Date.now() - startTime
            };
            if (this.config.useCache) {
                const cacheKey = this.hashText(truncatedText);
                this.embeddingCache.set(cacheKey, result);
            }
            return result;
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to generate embedding: ${error}`, this.config.aiProvider, 'embedding-generation');
        }
    }
    async generateOpenAIEmbedding(text) {
        console.log('Generating OpenAI embedding (mock implementation)');
        return this.generateMockEmbedding(text);
    }
    async generateGoogleEmbedding(text) {
        console.log('Generating Google embedding (mock implementation)');
        return this.generateMockEmbedding(text);
    }
    async generateFallbackEmbedding(text) {
        return this.generateWordFrequencyEmbedding(text);
    }
    generateMockEmbedding(text) {
        const dimensions = 1536;
        const embedding = new Array(dimensions);
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const rng = this.seededRandom(Math.abs(hash));
        for (let i = 0; i < dimensions; i++) {
            embedding[i] = (rng() - 0.5) * 2;
        }
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / magnitude);
    }
    generateWordFrequencyEmbedding(text) {
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        const wordFreq = new Map();
        for (const word of words) {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
        const dimensions = 1536;
        const embedding = new Array(dimensions).fill(0);
        let index = 0;
        for (const [word, freq] of wordFreq.entries()) {
            if (index >= dimensions)
                break;
            const hash = this.hashString(word);
            const pos = Math.abs(hash) % dimensions;
            embedding[pos] += freq / words.length;
            index++;
        }
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
    }
    calculateCosineSimilarity(embedding1, embedding2) {
        if (embedding1.length !== embedding2.length) {
            throw new Error('Embeddings must have the same dimensions');
        }
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            magnitude1 += embedding1[i] * embedding1[i];
            magnitude2 += embedding2[i] * embedding2[i];
        }
        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);
        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }
        return dotProduct / (magnitude1 * magnitude2);
    }
    createProfileText(profile) {
        const parts = [];
        parts.push(`Artist: ${profile.name}`);
        if (profile.mediums.length > 0) {
            parts.push(`Mediums: ${profile.mediums.join(', ')}`);
        }
        if (profile.skills.length > 0) {
            parts.push(`Skills: ${profile.skills.join(', ')}`);
        }
        if (profile.interests.length > 0) {
            parts.push(`Interests: ${profile.interests.join(', ')}`);
        }
        if (profile.experience) {
            parts.push(`Experience: ${profile.experience}`);
        }
        if (profile.artistStatement) {
            parts.push(`Statement: ${profile.artistStatement}`);
        }
        if (profile.bio) {
            parts.push(`Bio: ${profile.bio}`);
        }
        return parts.join('. ');
    }
    createOpportunityText(opportunity) {
        const parts = [];
        parts.push(opportunity.title);
        if (opportunity.organization) {
            parts.push(`Organization: ${opportunity.organization}`);
        }
        parts.push(opportunity.description);
        if (opportunity.location) {
            parts.push(`Location: ${opportunity.location}`);
        }
        if (opportunity.amount) {
            parts.push(`Amount: ${opportunity.amount}`);
        }
        if (opportunity.tags.length > 0) {
            parts.push(`Tags: ${opportunity.tags.join(', ')}`);
        }
        return parts.join('. ');
    }
    normalizeScore(similarity) {
        const normalized = (similarity + 1) / 2;
        const enhanced = 1 / (1 + Math.exp(-4 * (normalized - 0.5)));
        return Math.max(0, Math.min(1, enhanced));
    }
    fallbackSemanticScore(profile, opportunity) {
        const profileWords = new Set([
            ...profile.mediums,
            ...profile.skills,
            ...profile.interests
        ].map(w => w.toLowerCase()));
        const opportunityWords = new Set([
            ...opportunity.tags,
            ...opportunity.title.toLowerCase().split(/\s+/),
            ...opportunity.description.toLowerCase().split(/\s+/)
        ].filter(w => w.length > 3));
        const overlap = new Set([...profileWords].filter(w => opportunityWords.has(w)));
        const union = new Set([...profileWords, ...opportunityWords]);
        return union.size > 0 ? overlap.size / union.size : 0.1;
    }
    getDefaultEmbeddingModel(provider) {
        switch (provider) {
            case 'openai':
                return 'text-embedding-3-small';
            case 'google':
                return 'text-embedding-gecko';
            case 'anthropic':
                return 'fallback';
            default:
                return 'fallback';
        }
    }
    seededRandom(seed) {
        let state = seed;
        return () => {
            state = (state * 1103515245 + 12345) & 0x7fffffff;
            return state / 0x7fffffff;
        };
    }
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    async healthCheck() {
        try {
            const result = await this.generateEmbedding('health check test');
            return result.embedding.length > 0;
        }
        catch (error) {
            console.error('SemanticScorer health check failed:', error);
            return false;
        }
    }
    clearCache() {
        this.embeddingCache.clear();
    }
    getCacheStats() {
        return {
            size: this.embeddingCache.size,
            hitRate: 0
        };
    }
    async shutdown() {
        this.clearCache();
        this.isInitialized = false;
    }
}
exports.SemanticScorer = SemanticScorer;
//# sourceMappingURL=SemanticScorer.js.map