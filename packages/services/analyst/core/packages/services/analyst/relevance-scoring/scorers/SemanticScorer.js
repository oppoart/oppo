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
    /**
     * Initialize the semantic scorer
     */
    async initialize() {
        if (this.isInitialized)
            return;
        console.log(`Initializing SemanticScorer with ${this.config.aiProvider}...`);
        try {
            // Test embedding generation with a simple text
            await this.generateEmbedding('test');
            this.isInitialized = true;
            console.log('SemanticScorer initialized successfully');
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to initialize SemanticScorer: ${error}`, this.config.aiProvider, 'embedding-initialization');
        }
    }
    /**
     * Calculate semantic similarity score between artist profile and opportunity
     */
    async calculateScore(profile, opportunity) {
        if (!this.isInitialized) {
            throw new Error('SemanticScorer is not initialized');
        }
        try {
            // Create profile text representation
            const profileText = this.createProfileText(profile);
            // Create opportunity text representation
            const opportunityText = this.createOpportunityText(opportunity);
            // Generate embeddings
            const [profileEmbedding, opportunityEmbedding] = await Promise.all([
                this.generateEmbedding(profileText),
                this.generateEmbedding(opportunityText)
            ]);
            // Calculate cosine similarity
            const similarity = this.calculateCosineSimilarity(profileEmbedding.embedding, opportunityEmbedding.embedding);
            // Normalize to 0-1 range and apply sigmoid to enhance differences
            return this.normalizeScore(similarity);
        }
        catch (error) {
            console.error(`SemanticScorer error for opportunity ${opportunity.id}:`, error);
            // Fallback to keyword-based approximation if AI fails
            return this.fallbackSemanticScore(profile, opportunity);
        }
    }
    /**
     * Generate text embedding using configured AI service
     */
    async generateEmbedding(text) {
        const startTime = Date.now();
        // Truncate text if too long
        const truncatedText = text.length > this.config.maxTextLength ?
            text.substring(0, this.config.maxTextLength) + '...' : text;
        // Check cache first
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
                    // Anthropic doesn't have a direct embedding API, so we'll use a fallback
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
            // Cache the result
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
    /**
     * Generate embedding using OpenAI
     */
    async generateOpenAIEmbedding(text) {
        // In a real implementation, you would use the OpenAI SDK here
        // For now, we'll return a mock embedding
        console.log('Generating OpenAI embedding (mock implementation)');
        // Mock embedding - replace with actual OpenAI API call
        return this.generateMockEmbedding(text);
    }
    /**
     * Generate embedding using Google (Vertex AI)
     */
    async generateGoogleEmbedding(text) {
        // In a real implementation, you would use the Google Cloud AI SDK here
        console.log('Generating Google embedding (mock implementation)');
        // Mock embedding - replace with actual Google API call
        return this.generateMockEmbedding(text);
    }
    /**
     * Generate fallback embedding (for providers without embedding APIs)
     */
    async generateFallbackEmbedding(text) {
        // Simple word-frequency based embedding as fallback
        return this.generateWordFrequencyEmbedding(text);
    }
    /**
     * Generate mock embedding for development/testing
     */
    generateMockEmbedding(text) {
        const dimensions = 1536; // Standard OpenAI embedding dimensions
        const embedding = new Array(dimensions);
        // Simple hash-based mock embedding
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        // Generate pseudo-random embedding based on text hash
        const rng = this.seededRandom(Math.abs(hash));
        for (let i = 0; i < dimensions; i++) {
            embedding[i] = (rng() - 0.5) * 2; // Range: -1 to 1
        }
        // Normalize the vector
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / magnitude);
    }
    /**
     * Generate word frequency-based embedding
     */
    generateWordFrequencyEmbedding(text) {
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        const wordFreq = new Map();
        // Count word frequencies
        for (const word of words) {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
        // Convert to fixed-size embedding (simplified approach)
        const dimensions = 1536;
        const embedding = new Array(dimensions).fill(0);
        let index = 0;
        for (const [word, freq] of wordFreq.entries()) {
            if (index >= dimensions)
                break;
            // Simple hash to position
            const hash = this.hashString(word);
            const pos = Math.abs(hash) % dimensions;
            embedding[pos] += freq / words.length;
            index++;
        }
        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
    }
    /**
     * Calculate cosine similarity between two embeddings
     */
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
    /**
     * Create text representation of artist profile for embedding
     */
    createProfileText(profile) {
        const parts = [];
        // Core identity
        parts.push(`Artist: ${profile.name}`);
        // Mediums and skills
        if (profile.mediums.length > 0) {
            parts.push(`Mediums: ${profile.mediums.join(', ')}`);
        }
        if (profile.skills.length > 0) {
            parts.push(`Skills: ${profile.skills.join(', ')}`);
        }
        // Interests and focus areas
        if (profile.interests.length > 0) {
            parts.push(`Interests: ${profile.interests.join(', ')}`);
        }
        // Experience and background
        if (profile.experience) {
            parts.push(`Experience: ${profile.experience}`);
        }
        // Artistic statement
        if (profile.artistStatement) {
            parts.push(`Statement: ${profile.artistStatement}`);
        }
        // Bio
        if (profile.bio) {
            parts.push(`Bio: ${profile.bio}`);
        }
        return parts.join('. ');
    }
    /**
     * Create text representation of opportunity for embedding
     */
    createOpportunityText(opportunity) {
        const parts = [];
        // Title and organization
        parts.push(opportunity.title);
        if (opportunity.organization) {
            parts.push(`Organization: ${opportunity.organization}`);
        }
        // Description
        parts.push(opportunity.description);
        // Location and amount
        if (opportunity.location) {
            parts.push(`Location: ${opportunity.location}`);
        }
        if (opportunity.amount) {
            parts.push(`Amount: ${opportunity.amount}`);
        }
        // Tags
        if (opportunity.tags.length > 0) {
            parts.push(`Tags: ${opportunity.tags.join(', ')}`);
        }
        return parts.join('. ');
    }
    /**
     * Normalize similarity score to 0-1 range with sigmoid enhancement
     */
    normalizeScore(similarity) {
        // Cosine similarity is already -1 to 1, convert to 0-1
        const normalized = (similarity + 1) / 2;
        // Apply sigmoid to enhance differences
        const enhanced = 1 / (1 + Math.exp(-4 * (normalized - 0.5)));
        return Math.max(0, Math.min(1, enhanced));
    }
    /**
     * Fallback semantic score when AI embedding fails
     */
    fallbackSemanticScore(profile, opportunity) {
        // Simple keyword overlap as fallback
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
    /**
     * Get default embedding model for AI provider
     */
    getDefaultEmbeddingModel(provider) {
        switch (provider) {
            case 'openai':
                return 'text-embedding-3-small';
            case 'google':
                return 'text-embedding-gecko';
            case 'anthropic':
                return 'fallback'; // Anthropic doesn't have embedding models
            default:
                return 'fallback';
        }
    }
    /**
     * Simple seeded random number generator
     */
    seededRandom(seed) {
        let state = seed;
        return () => {
            state = (state * 1103515245 + 12345) & 0x7fffffff;
            return state / 0x7fffffff;
        };
    }
    /**
     * Hash text for caching
     */
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Hash string for word positioning
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    /**
     * Health check
     */
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
    /**
     * Clear embedding cache
     */
    clearCache() {
        this.embeddingCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.embeddingCache.size,
            hitRate: 0 // Would need hit/miss tracking for real hit rate
        };
    }
    /**
     * Shutdown the scorer
     */
    async shutdown() {
        this.clearCache();
        this.isInitialized = false;
    }
}
exports.SemanticScorer = SemanticScorer;
