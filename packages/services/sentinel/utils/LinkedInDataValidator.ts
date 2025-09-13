/**
 * LinkedIn Data Validation and Cleaning Utilities
 * Comprehensive validation and cleaning for LinkedIn content and opportunities
 */

import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { 
  LinkedInContent, 
  ContentValidationResult, 
  ContentEnrichment 
} from '../types/linkedin.types';
import { LINKEDIN_VALIDATION, LINKEDIN_SEARCH_TERMS } from '../config/linkedin.config';

/**
 * Validation configuration
 */
export interface ValidationConfig {
  enableStrictValidation: boolean;
  enableContentEnrichment: boolean;
  enableDuplicateDetection: boolean;
  enableLanguageDetection: boolean;
  minQualityScore: number;
  blockedKeywords: string[];
  requiredKeywords: string[];
}

/**
 * Content quality metrics
 */
export interface ContentQuality {
  score: number;
  factors: {
    length: number;
    readability: number;
    relevance: number;
    completeness: number;
    freshness: number;
  };
  issues: string[];
  recommendations: string[];
}

/**
 * Data cleaning result
 */
export interface CleaningResult {
  originalContent: string;
  cleanedContent: string;
  changesMade: string[];
  qualityImproved: boolean;
}

/**
 * LinkedIn data validator and cleaner
 */
export class LinkedInDataValidator {
  private config: ValidationConfig;
  private seenContentHashes: Set<string> = new Set();

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      enableStrictValidation: false,
      enableContentEnrichment: true,
      enableDuplicateDetection: true,
      enableLanguageDetection: true,
      minQualityScore: 60,
      blockedKeywords: [
        'spam', 'scam', 'fake', 'pyramid', 'mlm', 'get rich quick',
        'work from home guaranteed', 'make money fast', 'easy money'
      ],
      requiredKeywords: LINKEDIN_SEARCH_TERMS.opportunities,
      ...config
    };
  }

  /**
   * Validate LinkedIn content
   */
  validateContent(content: LinkedInContent): ContentValidationResult {
    const validation: ContentValidationResult = {
      isValid: false,
      score: 0,
      reasons: [],
      hasOpportunityKeywords: false,
      meetsSizeRequirements: false,
      hasRequiredFields: false
    };

    // Check required fields
    validation.hasRequiredFields = this.validateRequiredFields(content);
    if (!validation.hasRequiredFields) {
      validation.reasons.push('Missing required fields (title, content, or URL)');
    } else {
      validation.score += 20;
    }

    // Check size requirements
    validation.meetsSizeRequirements = this.validateSizeRequirements(content);
    if (!validation.meetsSizeRequirements) {
      validation.reasons.push(
        `Content too short (title: ${content.title.length}, content: ${content.content.length})`
      );
    } else {
      validation.score += 20;
    }

    // Check for opportunity keywords
    validation.hasOpportunityKeywords = this.hasOpportunityKeywords(content);
    if (!validation.hasOpportunityKeywords) {
      validation.reasons.push('No relevant opportunity keywords found');
    } else {
      validation.score += 30;
    }

    // Check for blocked content
    const hasBlockedContent = this.hasBlockedKeywords(content);
    if (hasBlockedContent) {
      validation.reasons.push('Contains blocked keywords (spam/scam indicators)');
      validation.score -= 50;
    }

    // Check content quality
    const quality = this.assessContentQuality(content);
    validation.score += Math.round(quality.score * 0.3);

    // Check for duplicates
    if (this.config.enableDuplicateDetection && this.isDuplicate(content)) {
      validation.reasons.push('Duplicate content detected');
      validation.score -= 20;
    }

    // Language detection
    if (this.config.enableLanguageDetection && !this.isEnglishContent(content)) {
      validation.reasons.push('Content not in English');
      if (this.config.enableStrictValidation) {
        validation.score -= 30;
      }
    }

    // Final validation
    validation.score = Math.max(0, Math.min(100, validation.score));
    validation.isValid = validation.hasRequiredFields && 
                        validation.meetsSizeRequirements && 
                        validation.hasOpportunityKeywords &&
                        validation.score >= this.config.minQualityScore;

    return validation;
  }

  /**
   * Validate opportunity data
   */
  validateOpportunity(opportunity: OpportunityData): ContentValidationResult {
    const validation: ContentValidationResult = {
      isValid: false,
      score: 0,
      reasons: [],
      hasOpportunityKeywords: false,
      meetsSizeRequirements: false,
      hasRequiredFields: false
    };

    // Check required fields
    const requiredFields = ['title', 'description', 'url'];
    const missingFields = requiredFields.filter(field => 
      !opportunity[field as keyof OpportunityData] || 
      (opportunity[field as keyof OpportunityData] as string).trim() === ''
    );

    validation.hasRequiredFields = missingFields.length === 0;
    if (!validation.hasRequiredFields) {
      validation.reasons.push(`Missing required fields: ${missingFields.join(', ')}`);
    } else {
      validation.score += 30;
    }

    // Check size requirements
    const titleLength = opportunity.title?.length || 0;
    const descLength = opportunity.description?.length || 0;
    
    validation.meetsSizeRequirements = 
      titleLength >= LINKEDIN_VALIDATION.opportunity.minTitleLength &&
      descLength >= LINKEDIN_VALIDATION.opportunity.minDescriptionLength;

    if (!validation.meetsSizeRequirements) {
      validation.reasons.push(
        `Content too short (title: ${titleLength}, description: ${descLength})`
      );
    } else {
      validation.score += 20;
    }

    // Check for opportunity keywords
    const textToCheck = `${opportunity.title || ''} ${opportunity.description || ''}`.toLowerCase();
    validation.hasOpportunityKeywords = LINKEDIN_VALIDATION.opportunity.opportunityKeywords
      .some(keyword => textToCheck.includes(keyword.toLowerCase()));

    if (!validation.hasOpportunityKeywords) {
      validation.reasons.push('No relevant opportunity keywords found');
    } else {
      validation.score += 30;
    }

    // Check URL validity
    if (opportunity.url && !this.isValidUrl(opportunity.url)) {
      validation.reasons.push('Invalid URL format');
      validation.score -= 10;
    } else if (opportunity.url) {
      validation.score += 10;
    }

    // Check organization
    if (opportunity.organization && opportunity.organization.trim().length > 0) {
      validation.score += 10;
    }

    validation.score = Math.max(0, Math.min(100, validation.score));
    validation.isValid = validation.hasRequiredFields && 
                        validation.meetsSizeRequirements && 
                        validation.hasOpportunityKeywords &&
                        validation.score >= this.config.minQualityScore;

    return validation;
  }

  /**
   * Clean and normalize content
   */
  cleanContent(content: string): CleaningResult {
    const original = content;
    const changesMade: string[] = [];
    let cleaned = content;

    // Remove excessive whitespace
    const beforeWhitespace = cleaned;
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (cleaned !== beforeWhitespace) {
      changesMade.push('Normalized whitespace');
    }

    // Remove HTML entities
    const beforeEntities = cleaned;
    cleaned = cleaned
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    if (cleaned !== beforeEntities) {
      changesMade.push('Decoded HTML entities');
    }

    // Remove LinkedIn-specific noise
    const beforeNoise = cleaned;
    cleaned = cleaned
      .replace(/\bSee more\b/gi, '')
      .replace(/\bShow more\b/gi, '')
      .replace(/\bLess\b$/gi, '')
      .replace(/\.\.\.$/, '')
      .replace(/^Posted by\s+/gi, '')
      .replace(/\s+ago$/, '');
    if (cleaned !== beforeNoise) {
      changesMade.push('Removed LinkedIn UI text');
    }

    // Fix common punctuation issues
    const beforePunctuation = cleaned;
    cleaned = cleaned
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .replace(/\.{2,}/g, '...')
      .replace(/\?{2,}/g, '?')
      .replace(/!{2,}/g, '!');
    if (cleaned !== beforePunctuation) {
      changesMade.push('Fixed punctuation');
    }

    // Remove excessive line breaks
    const beforeLineBreaks = cleaned;
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    if (cleaned !== beforeLineBreaks) {
      changesMade.push('Normalized line breaks');
    }

    // Trim final result
    cleaned = cleaned.trim();

    return {
      originalContent: original,
      cleanedContent: cleaned,
      changesMade,
      qualityImproved: cleaned.length < original.length || changesMade.length > 0
    };
  }

  /**
   * Assess content quality
   */
  assessContentQuality(content: LinkedInContent): ContentQuality {
    const quality: ContentQuality = {
      score: 0,
      factors: {
        length: 0,
        readability: 0,
        relevance: 0,
        completeness: 0,
        freshness: 0
      },
      issues: [],
      recommendations: []
    };

    // Length factor (0-100)
    const contentLength = content.content.length;
    if (contentLength < 50) {
      quality.factors.length = Math.min(contentLength * 2, 100);
      quality.issues.push('Content is very short');
      quality.recommendations.push('Look for more detailed descriptions');
    } else if (contentLength < 200) {
      quality.factors.length = 50 + (contentLength - 50) / 3;
    } else {
      quality.factors.length = Math.min(100, 100 - (contentLength - 500) / 20);
    }

    // Readability factor (basic metrics)
    const sentences = content.content.split(/[.!?]+/).length;
    const words = content.content.split(/\s+/).length;
    const avgWordsPerSentence = words / Math.max(sentences, 1);
    
    if (avgWordsPerSentence > 25) {
      quality.factors.readability = 50;
      quality.issues.push('Sentences may be too long');
    } else if (avgWordsPerSentence < 5) {
      quality.factors.readability = 60;
      quality.issues.push('Sentences may be too short');
    } else {
      quality.factors.readability = 80;
    }

    // Relevance factor (keyword density)
    const relevantKeywordCount = this.countRelevantKeywords(content);
    quality.factors.relevance = Math.min(relevantKeywordCount * 20, 100);
    
    if (relevantKeywordCount === 0) {
      quality.issues.push('No relevant keywords found');
      quality.recommendations.push('Verify this is actually an opportunity');
    }

    // Completeness factor (presence of important fields)
    let completenessScore = 0;
    if (content.author && content.author !== 'Unknown') completenessScore += 20;
    if (content.location) completenessScore += 20;
    if (content.company) completenessScore += 20;
    if (content.contentUrl) completenessScore += 20;
    if (content.publishedAt) completenessScore += 20;
    
    quality.factors.completeness = completenessScore;
    
    if (completenessScore < 60) {
      quality.issues.push('Missing important metadata');
      quality.recommendations.push('Try to extract more complete information');
    }

    // Freshness factor (how recent the content is)
    const daysSincePublished = (Date.now() - content.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSincePublished <= 1) {
      quality.factors.freshness = 100;
    } else if (daysSincePublished <= 7) {
      quality.factors.freshness = 90;
    } else if (daysSincePublished <= 30) {
      quality.factors.freshness = 70;
    } else if (daysSincePublished <= 90) {
      quality.factors.freshness = 50;
    } else {
      quality.factors.freshness = 20;
      quality.issues.push('Content is quite old');
    }

    // Calculate overall score
    quality.score = Object.values(quality.factors).reduce((sum, factor) => sum + factor, 0) / 5;

    return quality;
  }

  /**
   * Enrich content with additional metadata
   */
  enrichContent(content: LinkedInContent): ContentEnrichment {
    const enrichment: ContentEnrichment = {};

    // Analyze sentiment (basic keyword-based)
    const text = `${content.title} ${content.content}`.toLowerCase();
    const positiveWords = ['opportunity', 'excited', 'great', 'amazing', 'excellent', 'wonderful'];
    const negativeWords = ['unfortunately', 'sadly', 'difficult', 'challenging', 'problem'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      enrichment.sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      enrichment.sentiment = 'negative';
    } else {
      enrichment.sentiment = 'neutral';
    }

    // Analyze urgency
    const urgentWords = ['urgent', 'asap', 'immediately', 'deadline', 'closing soon'];
    const hasUrgentWords = urgentWords.some(word => text.includes(word));
    enrichment.urgency = hasUrgentWords ? 'high' : 'low';

    // Detect remote work
    const remoteWords = ['remote', 'work from home', 'telecommute', 'virtual', 'distributed'];
    enrichment.remote_friendly = remoteWords.some(word => text.includes(word));

    // Extract experience level
    if (text.includes('entry level') || text.includes('junior') || text.includes('graduate')) {
      enrichment.experience_level = 'entry';
    } else if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
      enrichment.experience_level = 'senior';
    } else if (text.includes('director') || text.includes('vp') || text.includes('executive')) {
      enrichment.experience_level = 'executive';
    } else {
      enrichment.experience_level = 'mid';
    }

    return enrichment;
  }

  /**
   * Validation helper methods
   */
  private validateRequiredFields(content: LinkedInContent): boolean {
    return Boolean(
      content.title?.trim() &&
      content.content?.trim() &&
      content.contentUrl?.trim()
    );
  }

  private validateSizeRequirements(content: LinkedInContent): boolean {
    return (
      content.title.length >= LINKEDIN_VALIDATION.opportunity.minTitleLength &&
      content.content.length >= LINKEDIN_VALIDATION.opportunity.minDescriptionLength
    );
  }

  private hasOpportunityKeywords(content: LinkedInContent): boolean {
    const text = `${content.title} ${content.content}`.toLowerCase();
    return LINKEDIN_VALIDATION.opportunity.opportunityKeywords
      .some(keyword => text.includes(keyword.toLowerCase()));
  }

  private hasBlockedKeywords(content: LinkedInContent): boolean {
    const text = `${content.title} ${content.content}`.toLowerCase();
    return this.config.blockedKeywords
      .some(keyword => text.includes(keyword.toLowerCase()));
  }

  private countRelevantKeywords(content: LinkedInContent): number {
    const text = `${content.title} ${content.content}`.toLowerCase();
    return this.config.requiredKeywords
      .filter(keyword => text.includes(keyword.toLowerCase())).length;
  }

  private isDuplicate(content: LinkedInContent): boolean {
    const hash = this.generateContentHash(content);
    if (this.seenContentHashes.has(hash)) {
      return true;
    }
    this.seenContentHashes.add(hash);
    return false;
  }

  private generateContentHash(content: LinkedInContent): string {
    const key = `${content.title}|${content.author}|${content.content.substring(0, 100)}`;
    return this.simpleHash(key);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private isEnglishContent(content: LinkedInContent): boolean {
    const text = `${content.title} ${content.content}`;
    const englishLetters = (text.match(/[a-zA-Z]/g) || []).length;
    const totalLetters = (text.match(/\p{L}/gu) || []).length;
    
    return totalLetters === 0 || (englishLetters / totalLetters) > 0.7;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Batch validation for multiple items
   */
  validateMultipleContents(contents: LinkedInContent[]): ContentValidationResult[] {
    return contents.map(content => this.validateContent(content));
  }

  validateMultipleOpportunities(opportunities: OpportunityData[]): ContentValidationResult[] {
    return opportunities.map(opportunity => this.validateOpportunity(opportunity));
  }

  /**
   * Reset duplicate detection cache
   */
  resetDuplicateCache(): void {
    this.seenContentHashes.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return {
      seenContentCount: this.seenContentHashes.size,
      config: { ...this.config }
    };
  }
}