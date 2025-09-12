import { OpportunityData, SourceType } from '../../../../apps/backend/src/types/discovery';

/**
 * Configuration for source attribution
 */
export interface AttributionConfig {
  enabled: boolean;
  trackDiscoveryMetadata: boolean;
  trackProcessingChain: boolean;
  calculateCredibilityScore: boolean;
  enrichSourceInfo: boolean;
  preserveOriginalMetadata: boolean;
}

/**
 * Source credibility metrics
 */
export interface SourceCredibility {
  score: number; // 0-1 scale
  factors: {
    domainAuthority: number;
    contentQuality: number;
    updateFrequency: number;
    historicalAccuracy: number;
  };
  flags: string[];
  lastUpdated: Date;
}

/**
 * Discovery chain step
 */
export interface DiscoveryStep {
  stepName: string;
  processor: string;
  timestamp: Date;
  durationMs: number;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * Enhanced source metadata
 */
export interface EnhancedSourceMetadata {
  // Original discovery info
  discoveredAt: Date;
  discovererName: string;
  discovererVersion: string;
  sourceUrl?: string;
  sourceType: SourceType;

  // Processing chain
  processingChain: DiscoveryStep[];
  totalProcessingTime: number;

  // Source analysis
  credibility: SourceCredibility;
  sourceInfo: {
    domain?: string;
    path?: string;
    title?: string;
    language?: string;
    lastModified?: Date;
    contentType?: string;
  };

  // Quality indicators
  extractionQuality: number;
  dataCompleteness: number;
  
  // Attribution
  attributedAt: Date;
  attributorVersion: string;
}

/**
 * Attribution result
 */
export interface AttributionResult {
  success: boolean;
  data: OpportunityData | null;
  errors: string[];
  processingTimeMs: number;
  metadata: EnhancedSourceMetadata;
}

/**
 * SourceAttributor tracks source information and discovery metadata
 * Provides credibility scoring and complete audit trail
 */
export class SourceAttributor {
  private config: AttributionConfig;
  private readonly version = '1.0.0';

  constructor(config: Partial<AttributionConfig> = {}) {
    this.config = {
      enabled: true,
      trackDiscoveryMetadata: true,
      trackProcessingChain: true,
      calculateCredibilityScore: true,
      enrichSourceInfo: true,
      preserveOriginalMetadata: true,
      ...config
    };
  }

  /**
   * Add source attribution and metadata to opportunity data
   */
  async attribute(
    data: OpportunityData,
    processingSteps: DiscoveryStep[] = [],
    originalMetadata?: Record<string, any>
  ): Promise<AttributionResult> {
    const startTime = Date.now();
    
    const result: AttributionResult = {
      success: false,
      data: null,
      errors: [],
      processingTimeMs: 0,
      metadata: {
        discoveredAt: new Date(),
        discovererName: 'unknown',
        discovererVersion: '1.0.0',
        sourceType: data.sourceType || 'manual',
        processingChain: [],
        totalProcessingTime: 0,
        credibility: {
          score: 0.5,
          factors: {
            domainAuthority: 0.5,
            contentQuality: 0.5,
            updateFrequency: 0.5,
            historicalAccuracy: 0.5
          },
          flags: [],
          lastUpdated: new Date()
        },
        sourceInfo: {},
        extractionQuality: 0.5,
        dataCompleteness: 0.5,
        attributedAt: new Date(),
        attributorVersion: this.version
      }
    };

    try {
      if (!this.config.enabled) {
        throw new Error('SourceAttributor is disabled');
      }

      // Create enhanced copy of data
      const attributedData = { ...data };

      // Extract existing source metadata
      const existingMetadata = data.sourceMetadata || {};
      
      // Build enhanced metadata
      result.metadata = await this.buildEnhancedMetadata(
        data,
        processingSteps,
        existingMetadata,
        originalMetadata
      );

      // Calculate credibility score
      if (this.config.calculateCredibilityScore) {
        result.metadata.credibility = await this.calculateCredibilityScore(data);
      }

      // Enrich source information
      if (this.config.enrichSourceInfo && data.url) {
        result.metadata.sourceInfo = await this.enrichSourceInfo(data.url);
      }

      // Calculate quality metrics
      result.metadata.extractionQuality = this.calculateExtractionQuality(data);
      result.metadata.dataCompleteness = this.calculateDataCompleteness(data);

      // Update opportunity with enhanced metadata
      attributedData.sourceMetadata = {
        ...(this.config.preserveOriginalMetadata ? existingMetadata : {}),
        ...result.metadata
      };

      // Add processing metadata
      attributedData.processingTimeMs = (attributedData.processingTimeMs || 0) + result.metadata.totalProcessingTime;
      
      result.data = attributedData;
      result.success = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Attribution failed: ${errorMessage}`);
      console.error('SourceAttributor error:', error);
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Build enhanced metadata from various sources
   */
  private async buildEnhancedMetadata(
    data: OpportunityData,
    processingSteps: DiscoveryStep[],
    existingMetadata: Record<string, any>,
    originalMetadata?: Record<string, any>
  ): Promise<EnhancedSourceMetadata> {
    const now = new Date();

    // Extract discovery info from existing metadata
    const discoveredAt = existingMetadata.discoveredAt ? 
      new Date(existingMetadata.discoveredAt) : now;
    const discovererName = existingMetadata.discovererName || 'unknown';
    const discovererVersion = existingMetadata.discovererVersion || '1.0.0';

    // Build processing chain
    const processingChain: DiscoveryStep[] = [];
    
    if (this.config.trackProcessingChain) {
      // Add existing steps from metadata
      if (existingMetadata.processingChain) {
        processingChain.push(...existingMetadata.processingChain);
      }
      
      // Add new processing steps
      processingChain.push(...processingSteps);
      
      // Add attribution step
      processingChain.push({
        stepName: 'source_attribution',
        processor: 'SourceAttributor',
        timestamp: now,
        durationMs: 0, // Will be updated later
        success: true,
        metadata: {
          version: this.version,
          config: this.config
        }
      });
    }

    // Calculate total processing time
    const totalProcessingTime = processingChain.reduce(
      (total, step) => total + step.durationMs, 
      0
    );

    return {
      discoveredAt,
      discovererName,
      discovererVersion,
      sourceUrl: data.sourceUrl,
      sourceType: data.sourceType || 'manual',
      processingChain,
      totalProcessingTime,
      credibility: {
        score: 0.5,
        factors: {
          domainAuthority: 0.5,
          contentQuality: 0.5,
          updateFrequency: 0.5,
          historicalAccuracy: 0.5
        },
        flags: [],
        lastUpdated: now
      },
      sourceInfo: {},
      extractionQuality: 0.5,
      dataCompleteness: 0.5,
      attributedAt: now,
      attributorVersion: this.version
    };
  }

  /**
   * Calculate credibility score for the source
   */
  private async calculateCredibilityScore(data: OpportunityData): Promise<SourceCredibility> {
    const credibility: SourceCredibility = {
      score: 0.5,
      factors: {
        domainAuthority: 0.5,
        contentQuality: 0.5,
        updateFrequency: 0.5,
        historicalAccuracy: 0.5
      },
      flags: [],
      lastUpdated: new Date()
    };

    try {
      // Domain authority assessment
      credibility.factors.domainAuthority = await this.assessDomainAuthority(data.url);

      // Content quality assessment
      credibility.factors.contentQuality = this.assessContentQuality(data);

      // Update frequency assessment (if we have historical data)
      credibility.factors.updateFrequency = await this.assessUpdateFrequency(data.url);

      // Historical accuracy (placeholder - would need historical data)
      credibility.factors.historicalAccuracy = 0.7; // Default assumption

      // Calculate overall score
      credibility.score = (
        credibility.factors.domainAuthority * 0.3 +
        credibility.factors.contentQuality * 0.4 +
        credibility.factors.updateFrequency * 0.2 +
        credibility.factors.historicalAccuracy * 0.1
      );

      // Add flags based on assessment
      if (credibility.factors.domainAuthority < 0.3) {
        credibility.flags.push('low_domain_authority');
      }
      
      if (credibility.factors.contentQuality < 0.4) {
        credibility.flags.push('low_content_quality');
      }

      if (credibility.score < 0.3) {
        credibility.flags.push('low_overall_credibility');
      }

    } catch (error) {
      console.warn('Error calculating credibility score:', error);
      credibility.flags.push('credibility_assessment_failed');
    }

    return credibility;
  }

  /**
   * Assess domain authority
   */
  private async assessDomainAuthority(url?: string): Promise<number> {
    if (!url) return 0.3;

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // Known high-authority domains for artist opportunities
      const highAuthorityDomains = [
        'arts.gov', 'nea.gov', 'smithsonian.edu', 'moma.org', 'metmuseum.org',
        'guggenheim.org', 'whitney.org', 'lacma.org', 'sfmoma.org', 'tate.org.uk',
        'artforum.com', 'artnet.com', 'artsy.net', 'hyperallergic.com',
        'caa.edu', 'collegeart.org', 'foundationfordcontemporaryarts.org'
      ];

      // Known medium-authority domains
      const mediumAuthorityDomains = [
        'artconnect.com', 'artsake.org', 'callforentry.org', 'submittable.com',
        'artfund.org', 'artists.org', 'foundation.org', 'gallery.org'
      ];

      // Check for exact matches
      if (highAuthorityDomains.some(d => domain.includes(d))) {
        return 0.9;
      }

      if (mediumAuthorityDomains.some(d => domain.includes(d))) {
        return 0.7;
      }

      // Check for domain characteristics
      let score = 0.5;

      // .gov domains
      if (domain.endsWith('.gov')) {
        score += 0.3;
      }
      
      // .edu domains
      if (domain.endsWith('.edu')) {
        score += 0.2;
      }

      // .org domains
      if (domain.endsWith('.org')) {
        score += 0.1;
      }

      // Art-related keywords in domain
      const artKeywords = ['art', 'artist', 'gallery', 'museum', 'creative', 'foundation'];
      if (artKeywords.some(keyword => domain.includes(keyword))) {
        score += 0.1;
      }

      return Math.min(score, 1.0);

    } catch (error) {
      return 0.3; // Default for invalid URLs
    }
  }

  /**
   * Assess content quality
   */
  private assessContentQuality(data: OpportunityData): number {
    let score = 0.5;

    // Title quality
    if (data.title) {
      if (data.title.length > 20 && data.title.length < 100) {
        score += 0.1;
      }
      if (!/click here|learn more|read more/i.test(data.title)) {
        score += 0.05;
      }
    }

    // Description quality
    if (data.description) {
      if (data.description.length > 100) {
        score += 0.1;
      }
      if (data.description.length > 300) {
        score += 0.05;
      }
      if (!/lorem ipsum|placeholder/i.test(data.description)) {
        score += 0.05;
      }
    }

    // Organization presence
    if (data.organization && data.organization.length > 3) {
      score += 0.1;
    }

    // Deadline presence (indicates structured opportunity)
    if (data.deadline) {
      score += 0.1;
    }

    // Amount presence
    if (data.amount) {
      score += 0.05;
    }

    // Location presence
    if (data.location) {
      score += 0.05;
    }

    // Tags presence (indicates categorization)
    if (data.tags && data.tags.length > 0) {
      score += 0.05;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Assess update frequency (placeholder for now)
   */
  private async assessUpdateFrequency(url?: string): Promise<number> {
    // This would ideally check how frequently the source updates
    // For now, return a default score
    return 0.6;
  }

  /**
   * Enrich source information from URL
   */
  private async enrichSourceInfo(url: string): Promise<Record<string, any>> {
    const sourceInfo: Record<string, any> = {};

    try {
      const urlObj = new URL(url);
      
      sourceInfo.domain = urlObj.hostname;
      sourceInfo.path = urlObj.pathname;
      sourceInfo.protocol = urlObj.protocol;
      
      // Extract likely content type from path
      const path = urlObj.pathname.toLowerCase();
      if (path.includes('job') || path.includes('career')) {
        sourceInfo.contentType = 'job_posting';
      } else if (path.includes('grant') || path.includes('funding')) {
        sourceInfo.contentType = 'grant_opportunity';
      } else if (path.includes('residency')) {
        sourceInfo.contentType = 'residency';
      } else if (path.includes('fellowship')) {
        sourceInfo.contentType = 'fellowship';
      } else if (path.includes('competition') || path.includes('contest')) {
        sourceInfo.contentType = 'competition';
      } else {
        sourceInfo.contentType = 'general_opportunity';
      }

      // Determine likely language from domain
      const domain = urlObj.hostname.toLowerCase();
      if (domain.endsWith('.uk') || domain.endsWith('.ca') || domain.endsWith('.au')) {
        sourceInfo.language = 'en';
      } else if (domain.endsWith('.de')) {
        sourceInfo.language = 'de';
      } else if (domain.endsWith('.fr')) {
        sourceInfo.language = 'fr';
      } else if (domain.endsWith('.es')) {
        sourceInfo.language = 'es';
      } else {
        sourceInfo.language = 'en'; // Default assumption
      }

    } catch (error) {
      console.warn('Error enriching source info:', error);
    }

    return sourceInfo;
  }

  /**
   * Calculate extraction quality score
   */
  private calculateExtractionQuality(data: OpportunityData): number {
    let score = 0;
    let maxScore = 0;

    // Required fields
    if (data.title) { score += 3; }
    if (data.description) { score += 3; }
    if (data.url) { score += 2; }
    maxScore += 8;

    // Optional but valuable fields
    if (data.organization) { score += 1; }
    if (data.deadline) { score += 1; }
    if (data.amount) { score += 1; }
    if (data.location) { score += 1; }
    maxScore += 4;

    // Quality indicators
    if (data.title && data.title.length > 10) { score += 0.5; }
    if (data.description && data.description.length > 50) { score += 0.5; }
    if (data.tags && data.tags.length > 0) { score += 0.5; }
    maxScore += 1.5;

    return Math.round((score / maxScore) * 100) / 100;
  }

  /**
   * Calculate data completeness score
   */
  private calculateDataCompleteness(data: OpportunityData): number {
    const allFields = [
      'title', 'description', 'url', 'organization', 
      'deadline', 'amount', 'location', 'tags'
    ];

    const filledFields = allFields.filter(field => {
      const value = data[field as keyof OpportunityData];
      return value && 
        (typeof value !== 'string' || value.trim() !== '') && 
        (!Array.isArray(value) || value.length > 0);
    });

    return Math.round((filledFields.length / allFields.length) * 100) / 100;
  }

  /**
   * Update a processing step with completion info
   */
  updateProcessingStep(
    metadata: EnhancedSourceMetadata, 
    stepName: string, 
    durationMs: number, 
    success: boolean = true
  ): void {
    const step = metadata.processingChain.find(s => s.stepName === stepName);
    if (step) {
      step.durationMs = durationMs;
      step.success = success;
      
      // Recalculate total processing time
      metadata.totalProcessingTime = metadata.processingChain.reduce(
        (total, s) => total + s.durationMs,
        0
      );
    }
  }

  /**
   * Add a new processing step
   */
  addProcessingStep(
    metadata: EnhancedSourceMetadata,
    step: Omit<DiscoveryStep, 'timestamp'>
  ): void {
    metadata.processingChain.push({
      ...step,
      timestamp: new Date()
    });
    
    metadata.totalProcessingTime += step.durationMs;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AttributionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AttributionConfig {
    return { ...this.config };
  }
}