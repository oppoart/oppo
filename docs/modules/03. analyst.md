# Analyst Module: Locally-Focused Semantic Matching

## Overview

The Analyst module forms the intellectual core of the agent, providing nuanced semantic understanding of opportunity relevance while maintaining complete privacy through on-device processing. It goes beyond simple keyword matching to understand conceptual relationships between artist profiles and opportunities.

## Architecture

### Processing Pipeline

```
┌─────────────────────────────────────────────┐
│         Opportunity Data Input               │
│        (from Sentinel Module)                │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│         Text Preprocessing                   │
│   • Normalization                            │
│   • Keyword extraction                       │
│   • Entity recognition                       │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│      Semantic Embedding Generation           │
│        (transformers.js)                     │
│   • Convert text to vectors                  │
│   • Local model inference                    │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│        Similarity Calculation                │
│   • Cosine similarity                        │
│   • Weighted scoring                         │
│   • Threshold filtering                      │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│         Hybrid Score Generation              │
│   • Semantic score (60%)                     │
│   • Keyword match (20%)                      │
│   • Category match (20%)                     │
└──────────────────────────────────────────────┘
```

## Core Components

### 1. Resume-Matcher Architecture Adaptation

Inspired by **srbhr/Resume-Matcher**, the module adapts resume-job matching logic for artist-opportunity matching.

#### Profile-Opportunity Mapping

```typescript
interface ArtistProfile {
  statement: string;           // Artist's creative statement
  themes: string[];            // e.g., ["post-humanism", "ecological art"]
  media: string[];             // e.g., ["oil painting", "digital sculpture"]  
  experience: ExperienceLevel; // emerging, mid-career, established
  location: string;            // Geographic location
  exhibitions: Exhibition[];   // Past exhibition history
  keywords: string[];          // Extracted/generated keywords
}

interface OpportunityDetails {
  title: string;
  description: string;
  organization: string;
  deadline: Date;
  eligibility: string;
  medium: string[];
  location: string;
  fee: number;
  type: OpportunityType; // grant, residency, exhibition, competition
}
```

### 2. On-Device Semantic Search with transformers.js

The key innovation: all AI processing happens locally, ensuring complete privacy.

#### Model Selection and Setup

```typescript
import { pipeline, env } from '@xenova/transformers';

class SemanticAnalyzer {
  private embedder: any;
  private model = 'Xenova/all-MiniLM-L6-v2'; // ~30MB model
  
  async initialize() {
    // Configure for local execution
    env.allowRemoteModels = false;
    env.localModelPath = './models';
    
    // Load sentence-transformer model
    this.embedder = await pipeline(
      'feature-extraction',
      this.model,
      { quantized: true } // Use quantized model for efficiency
    );
  }
  
  async generateEmbedding(text: string): Promise<Float32Array> {
    const output = await this.embedder(text, {
      pooling: 'mean',
      normalize: true
    });
    
    return output.data;
  }
}
```

#### Embedding Process

```typescript
class EmbeddingProcessor {
  async embedArtistProfile(profile: ArtistProfile): Promise<ProfileEmbedding> {
    // Combine relevant text fields
    const profileText = `
      ${profile.statement}
      ${profile.themes.join(' ')}
      ${profile.media.join(' ')}
      ${profile.keywords.join(' ')}
    `.trim();
    
    // Generate embedding
    const embedding = await this.analyzer.generateEmbedding(profileText);
    
    return {
      profileId: profile.id,
      embedding: embedding,
      metadata: {
        themes: profile.themes,
        media: profile.media,
        timestamp: new Date()
      }
    };
  }
  
  async embedOpportunity(opportunity: OpportunityDetails): Promise<OpportunityEmbedding> {
    const opportunityText = `
      ${opportunity.title}
      ${opportunity.description}
      ${opportunity.eligibility}
      ${opportunity.medium.join(' ')}
    `.trim();
    
    const embedding = await this.analyzer.generateEmbedding(opportunityText);
    
    return {
      opportunityId: opportunity.id,
      embedding: embedding,
      source: opportunity.source
    };
  }
}
```

### 3. Similarity Calculation

#### Cosine Similarity Implementation

```typescript
class SimilarityCalculator {
  calculateCosineSimilarity(vec1: Float32Array, vec2: Float32Array): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
  
  async calculateRelevance(
    profileEmbedding: Float32Array,
    opportunityEmbedding: Float32Array
  ): Promise<number> {
    const similarity = this.calculateCosineSimilarity(
      profileEmbedding,
      opportunityEmbedding
    );
    
    // Convert to 0-100 scale
    return Math.round((similarity + 1) * 50);
  }
}
```

### 4. Hybrid Scoring System

Combines multiple signals for comprehensive relevance assessment.

```typescript
class HybridScorer {
  async calculateHybridScore(
    profile: ArtistProfile,
    opportunity: OpportunityDetails,
    semanticScore: number
  ): Promise<ScoredOpportunity> {
    // Component scores
    const scores = {
      semantic: semanticScore * 0.6,           // 60% weight
      keyword: this.keywordMatch(profile, opportunity) * 0.2,    // 20% weight
      category: this.categoryMatch(profile, opportunity) * 0.2,   // 20% weight
    };
    
    // Bonus modifiers
    const modifiers = {
      locationMatch: this.checkLocationMatch(profile, opportunity) ? 5 : 0,
      deadlineProximity: this.getDeadlineBonus(opportunity.deadline),
      noFee: opportunity.fee === 0 ? 3 : 0
    };
    
    const finalScore = Object.values(scores).reduce((a, b) => a + b, 0) +
                      Object.values(modifiers).reduce((a, b) => a + b, 0);
    
    return {
      opportunity,
      scores: {
        total: Math.min(100, finalScore),
        semantic: semanticScore,
        breakdown: scores,
        modifiers
      },
      confidence: this.calculateConfidence(scores)
    };
  }
  
  private keywordMatch(profile: ArtistProfile, opportunity: OpportunityDetails): number {
    const profileKeywords = new Set([
      ...profile.keywords,
      ...profile.themes,
      ...profile.media
    ]);
    
    const opportunityText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
    let matches = 0;
    
    profileKeywords.forEach(keyword => {
      if (opportunityText.includes(keyword.toLowerCase())) {
        matches++;
      }
    });
    
    return (matches / profileKeywords.size) * 100;
  }
}
```

## Advanced Features

### 1. Learning from Feedback

The system improves over time based on user interactions.

```typescript
class FeedbackLearner {
  async updateWeights(feedback: UserFeedback) {
    if (feedback.action === 'accepted') {
      // Increase weight for matching features
      await this.adjustWeights(feedback.opportunity, 1.1);
    } else if (feedback.action === 'rejected') {
      // Decrease weight for matching features
      await this.adjustWeights(feedback.opportunity, 0.9);
    }
    
    // Retrain embeddings periodically
    if (this.shouldRetrain()) {
      await this.retrainModel();
    }
  }
}
```

### 2. Contextual Understanding

Beyond simple matching, understands relationships between concepts.

```typescript
class ContextualAnalyzer {
  async analyzeContext(opportunity: OpportunityDetails): Promise<Context> {
    return {
      themes: await this.extractThemes(opportunity),
      requirements: await this.parseRequirements(opportunity),
      implicitCriteria: await this.inferCriteria(opportunity),
      culturalContext: await this.analyzeCulturalFit(opportunity)
    };
  }
}
```

### 3. Multi-Language Support

Handles opportunities in different languages.

```typescript
class MultilingualAnalyzer {
  async processMultilingual(text: string): Promise<string> {
    const language = await this.detectLanguage(text);
    
    if (language !== 'en') {
      // Use local translation model
      return await this.translateLocally(text, language, 'en');
    }
    
    return text;
  }
}
```

## Performance Optimization

### Caching Strategy

```typescript
class EmbeddingCache {
  private cache: Map<string, Float32Array> = new Map();
  private maxSize = 1000;
  
  async getOrCompute(text: string, computer: Function): Promise<Float32Array> {
    const hash = this.hashText(text);
    
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }
    
    const embedding = await computer(text);
    this.cache.set(hash, embedding);
    
    // LRU eviction
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    return embedding;
  }
}
```

### Batch Processing

```typescript
class BatchProcessor {
  async processBatch(opportunities: OpportunityDetails[]): Promise<ScoredOpportunity[]> {
    // Process in parallel batches
    const batchSize = 10;
    const results: ScoredOpportunity[] = [];
    
    for (let i = 0; i < opportunities.length; i += batchSize) {
      const batch = opportunities.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(opp => this.scoreOpportunity(opp))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}
```

## Configuration

### Scoring Configuration

```typescript
export const analysisConfig = {
  weights: {
    semantic: 0.6,
    keyword: 0.2,
    category: 0.2
  },
  thresholds: {
    minimum: 40,      // Minimum score to consider
    recommend: 70,    // Threshold for recommendation
    autoApply: 85     // Threshold for auto-application suggestion
  },
  model: {
    name: 'Xenova/all-MiniLM-L6-v2',
    quantized: true,
    maxLength: 512
  }
};
```

## Privacy & Security

### Data Protection

```typescript
class PrivacyManager {
  // All processing happens locally
  private ensureLocalProcessing() {
    // Disable remote model downloads
    env.allowRemoteModels = false;
    
    // Block external API calls
    this.blockExternalCalls();
    
    // Encrypt stored embeddings
    this.enableEncryption();
  }
  
  // Sanitize data before processing
  sanitizeData(data: any): any {
    // Remove PII
    return this.removePII(data);
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('Analyst Module', () => {
  test('generates consistent embeddings', async () => {
    const text = 'Contemporary digital art';
    const embedding1 = await analyzer.generateEmbedding(text);
    const embedding2 = await analyzer.generateEmbedding(text);
    
    expect(embedding1).toEqual(embedding2);
  });
  
  test('calculates similarity correctly', () => {
    const vec1 = new Float32Array([1, 0, 0]);
    const vec2 = new Float32Array([0, 1, 0]);
    
    const similarity = calculator.calculateCosineSimilarity(vec1, vec2);
    expect(similarity).toBe(0);
  });
});
```

## Monitoring & Metrics

### Key Metrics
- Average processing time per opportunity
- Score distribution analysis
- User acceptance rate
- Model inference time
- Cache hit rate

## Dependencies

- **@xenova/transformers**: Local AI model execution
- **natural**: NLP utilities
- **compromise**: Text processing
- **ml-distance**: Distance calculations
- **node-cache**: Caching implementation

## Related Documentation

- [System Architecture](../architecture/system-architecture.md)
- [Sentinel Module](./sentinel.md)
- [Privacy & Security](../architecture/privacy-security.md)