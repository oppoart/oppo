import { OpportunityData } from '../../../../apps/backend/src/types/discovery';

/**
 * Configuration for content validation
 */
export interface ValidationConfig {
  enabled: boolean;
  strictMode: boolean;
  minTitleLength: number;
  maxTitleLength: number;
  minDescriptionLength: number;
  maxDescriptionLength: number;
  requireValidUrl: boolean;
  requireReasonableDeadline: boolean;
  maxFutureYears: number;
  flagLowQuality: boolean;
  qualityThreshold: number; // 0-1 scale
}

/**
 * Validation issue severity levels
 */
export enum ValidationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  field: string;
  severity: ValidationSeverity;
  message: string;
  suggestion?: string;
  code: string;
}

/**
 * Quality metrics for an opportunity
 */
export interface QualityMetrics {
  completeness: number; // 0-1: How many fields are filled
  accuracy: number; // 0-1: How accurate the data appears
  relevance: number; // 0-1: How relevant for artist opportunities
  freshness: number; // 0-1: How recent/up-to-date the data is
  overall: number; // 0-1: Overall quality score
}

/**
 * Validation result
 */
export interface ValidationResult {
  success: boolean;
  isValid: boolean;
  data: OpportunityData | null;
  issues: ValidationIssue[];
  qualityMetrics: QualityMetrics;
  processingTimeMs: number;
  metadata: {
    validationsPassed: number;
    validationsFailed: number;
    qualityFlags: string[];
  };
}

/**
 * ContentValidator performs field validation and quality assessment
 * Ensures data integrity and flags low-quality opportunities
 */
export class ContentValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      enabled: true,
      strictMode: false,
      minTitleLength: 5,
      maxTitleLength: 200,
      minDescriptionLength: 20,
      maxDescriptionLength: 5000,
      requireValidUrl: true,
      requireReasonableDeadline: true,
      maxFutureYears: 2,
      flagLowQuality: true,
      qualityThreshold: 0.6,
      ...config
    };
  }

  /**
   * Validate opportunity data and assess quality
   */
  async validate(data: OpportunityData): Promise<ValidationResult> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    let validationsPassed = 0;
    let validationsFailed = 0;

    const result: ValidationResult = {
      success: false,
      isValid: false,
      data: null,
      issues: [],
      qualityMetrics: {
        completeness: 0,
        accuracy: 0,
        relevance: 0,
        freshness: 0,
        overall: 0
      },
      processingTimeMs: 0,
      metadata: {
        validationsPassed: 0,
        validationsFailed: 0,
        qualityFlags: []
      }
    };

    try {
      if (!this.config.enabled) {
        throw new Error('ContentValidator is disabled');
      }

      // Required field validation
      const requiredFieldIssues = this.validateRequiredFields(data);
      issues.push(...requiredFieldIssues);
      
      // Field-specific validation
      const titleIssues = this.validateTitle(data.title);
      issues.push(...titleIssues);

      const descriptionIssues = this.validateDescription(data.description);
      issues.push(...descriptionIssues);

      const urlIssues = this.validateUrl(data.url);
      issues.push(...urlIssues);

      if (data.deadline) {
        const deadlineIssues = this.validateDeadline(data.deadline);
        issues.push(...deadlineIssues);
      }

      if (data.amount) {
        const amountIssues = this.validateAmount(data.amount);
        issues.push(...amountIssues);
      }

      if (data.organization) {
        const orgIssues = this.validateOrganization(data.organization);
        issues.push(...orgIssues);
      }

      if (data.location) {
        const locationIssues = this.validateLocation(data.location);
        issues.push(...locationIssues);
      }

      if (data.tags && data.tags.length > 0) {
        const tagIssues = this.validateTags(data.tags);
        issues.push(...tagIssues);
      }

      // Calculate validation stats
      const errorIssues = issues.filter(i => i.severity === ValidationSeverity.ERROR || i.severity === ValidationSeverity.CRITICAL);
      validationsFailed = errorIssues.length;
      validationsPassed = this.getTotalValidations() - validationsFailed;

      // Calculate quality metrics
      result.qualityMetrics = this.calculateQualityMetrics(data, issues);

      // Determine if valid
      const hasBlockingIssues = issues.some(i => i.severity === ValidationSeverity.CRITICAL);
      const hasStrictModeErrors = this.config.strictMode && issues.some(i => i.severity === ValidationSeverity.ERROR);
      
      result.isValid = !hasBlockingIssues && !hasStrictModeErrors;

      // Flag low quality opportunities
      if (this.config.flagLowQuality && result.qualityMetrics.overall < this.config.qualityThreshold) {
        result.metadata.qualityFlags.push('low_quality');
        issues.push({
          field: 'overall',
          severity: ValidationSeverity.WARNING,
          message: `Low quality score: ${(result.qualityMetrics.overall * 100).toFixed(1)}%`,
          suggestion: 'Consider manual review before processing',
          code: 'LOW_QUALITY'
        });
      }

      result.issues = issues;
      result.data = result.isValid ? data : null;
      result.success = true;
      result.metadata.validationsPassed = validationsPassed;
      result.metadata.validationsFailed = validationsFailed;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('ContentValidator error:', error);
      
      result.issues.push({
        field: 'system',
        severity: ValidationSeverity.CRITICAL,
        message: `Validation failed: ${errorMessage}`,
        code: 'VALIDATION_ERROR'
      });
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(data: OpportunityData): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const required = ['title', 'description', 'url'];

    required.forEach(field => {
      const value = data[field as keyof OpportunityData];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        issues.push({
          field,
          severity: ValidationSeverity.CRITICAL,
          message: `Required field '${field}' is missing or empty`,
          suggestion: `Ensure ${field} is properly extracted and not empty`,
          code: 'REQUIRED_FIELD_MISSING'
        });
      }
    });

    return issues;
  }

  /**
   * Validate title field
   */
  private validateTitle(title: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!title) return issues;

    // Length validation
    if (title.length < this.config.minTitleLength) {
      issues.push({
        field: 'title',
        severity: ValidationSeverity.ERROR,
        message: `Title too short (${title.length} characters, minimum ${this.config.minTitleLength})`,
        suggestion: 'Consider if this is a complete title or needs more context',
        code: 'TITLE_TOO_SHORT'
      });
    }

    if (title.length > this.config.maxTitleLength) {
      issues.push({
        field: 'title',
        severity: ValidationSeverity.WARNING,
        message: `Title very long (${title.length} characters, maximum recommended ${this.config.maxTitleLength})`,
        suggestion: 'Consider truncating or summarizing the title',
        code: 'TITLE_TOO_LONG'
      });
    }

    // Content quality checks
    if (title.toLowerCase().includes('click here') || title.toLowerCase().includes('learn more')) {
      issues.push({
        field: 'title',
        severity: ValidationSeverity.WARNING,
        message: 'Title appears to be a call-to-action rather than a descriptive title',
        suggestion: 'Extract the actual opportunity title instead of link text',
        code: 'TITLE_IS_CTA'
      });
    }

    // Check for excessive punctuation or formatting
    if (title.match(/[!]{2,}|[?]{2,}|[.]{3,}/)) {
      issues.push({
        field: 'title',
        severity: ValidationSeverity.INFO,
        message: 'Title contains excessive punctuation',
        suggestion: 'Clean up punctuation for better readability',
        code: 'TITLE_EXCESS_PUNCTUATION'
      });
    }

    return issues;
  }

  /**
   * Validate description field
   */
  private validateDescription(description: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!description) return issues;

    // Length validation
    if (description.length < this.config.minDescriptionLength) {
      issues.push({
        field: 'description',
        severity: ValidationSeverity.WARNING,
        message: `Description quite short (${description.length} characters, recommended minimum ${this.config.minDescriptionLength})`,
        suggestion: 'Check if full description was extracted',
        code: 'DESCRIPTION_TOO_SHORT'
      });
    }

    if (description.length > this.config.maxDescriptionLength) {
      issues.push({
        field: 'description',
        severity: ValidationSeverity.INFO,
        message: `Description very long (${description.length} characters)`,
        suggestion: 'Consider if this includes unnecessary content that should be removed',
        code: 'DESCRIPTION_TOO_LONG'
      });
    }

    // Content quality checks
    const repetitivePattern = /(.{10,})\1{2,}/;
    if (repetitivePattern.test(description)) {
      issues.push({
        field: 'description',
        severity: ValidationSeverity.WARNING,
        message: 'Description contains repetitive content',
        suggestion: 'Remove duplicate or repetitive sections',
        code: 'DESCRIPTION_REPETITIVE'
      });
    }

    // Check for placeholder text
    const placeholders = ['lorem ipsum', 'placeholder', 'sample text', 'dummy text'];
    if (placeholders.some(p => description.toLowerCase().includes(p))) {
      issues.push({
        field: 'description',
        severity: ValidationSeverity.ERROR,
        message: 'Description appears to contain placeholder text',
        code: 'DESCRIPTION_PLACEHOLDER'
      });
    }

    return issues;
  }

  /**
   * Validate URL field
   */
  private validateUrl(url: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!url) return issues;

    // URL format validation
    try {
      const urlObj = new URL(url);
      
      // Check for suspicious schemes
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        issues.push({
          field: 'url',
          severity: ValidationSeverity.ERROR,
          message: `Invalid URL protocol: ${urlObj.protocol}`,
          suggestion: 'Ensure URL uses http or https protocol',
          code: 'URL_INVALID_PROTOCOL'
        });
      }

      // Check for localhost or internal URLs
      if (urlObj.hostname === 'localhost' || urlObj.hostname.startsWith('127.') || urlObj.hostname.startsWith('192.168.')) {
        issues.push({
          field: 'url',
          severity: ValidationSeverity.ERROR,
          message: 'URL points to localhost or internal network',
          suggestion: 'Ensure URL is publicly accessible',
          code: 'URL_INTERNAL'
        });
      }

      // Check for common URL shorteners (may indicate low quality)
      const shorteners = ['bit.ly', 'tinyurl.com', 'short.link', 't.co'];
      if (shorteners.some(s => urlObj.hostname.includes(s))) {
        issues.push({
          field: 'url',
          severity: ValidationSeverity.WARNING,
          message: 'URL uses a URL shortener',
          suggestion: 'Consider resolving to the actual destination URL',
          code: 'URL_SHORTENED'
        });
      }

    } catch (error) {
      if (this.config.requireValidUrl) {
        issues.push({
          field: 'url',
          severity: ValidationSeverity.ERROR,
          message: 'Invalid URL format',
          suggestion: 'Check URL format and ensure it\'s properly formatted',
          code: 'URL_INVALID_FORMAT'
        });
      }
    }

    return issues;
  }

  /**
   * Validate deadline field
   */
  private validateDeadline(deadline: Date): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const now = new Date();
    const maxFutureDate = new Date(now.getFullYear() + this.config.maxFutureYears, now.getMonth(), now.getDate());

    // Check if deadline is in the past
    if (deadline < now) {
      issues.push({
        field: 'deadline',
        severity: ValidationSeverity.WARNING,
        message: 'Deadline is in the past',
        suggestion: 'Verify if this opportunity is still active or if the date is correct',
        code: 'DEADLINE_PAST'
      });
    }

    // Check if deadline is unreasonably far in the future
    if (deadline > maxFutureDate) {
      issues.push({
        field: 'deadline',
        severity: ValidationSeverity.WARNING,
        message: `Deadline is more than ${this.config.maxFutureYears} years in the future`,
        suggestion: 'Verify the deadline date is correct',
        code: 'DEADLINE_TOO_FUTURE'
      });
    }

    // Check if deadline is today (might be last-minute)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (deadline.toDateString() === today.toDateString()) {
      issues.push({
        field: 'deadline',
        severity: ValidationSeverity.INFO,
        message: 'Deadline is today',
        suggestion: 'Opportunity may be time-sensitive',
        code: 'DEADLINE_TODAY'
      });
    }

    return issues;
  }

  /**
   * Validate amount field
   */
  private validateAmount(amount: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!amount) return issues;

    // Check for common amount formats
    const amountPattern = /(\$|€|£|USD|EUR|GBP|\d+k|\d+,\d+|\d+)/i;
    if (!amountPattern.test(amount)) {
      issues.push({
        field: 'amount',
        severity: ValidationSeverity.WARNING,
        message: 'Amount format doesn\'t follow common patterns',
        suggestion: 'Verify the amount was extracted correctly',
        code: 'AMOUNT_UNUSUAL_FORMAT'
      });
    }

    // Check for placeholder amounts
    const placeholders = ['tbd', 'tba', 'varies', 'negotiable', 'competitive'];
    if (placeholders.some(p => amount.toLowerCase().includes(p))) {
      issues.push({
        field: 'amount',
        severity: ValidationSeverity.INFO,
        message: 'Amount is not specific (TBD, varies, etc.)',
        code: 'AMOUNT_NON_SPECIFIC'
      });
    }

    return issues;
  }

  /**
   * Validate organization field
   */
  private validateOrganization(organization: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!organization) return issues;

    // Check for overly generic organization names
    const generic = ['company', 'organization', 'institution', 'foundation', 'agency'];
    if (generic.some(g => organization.toLowerCase() === g)) {
      issues.push({
        field: 'organization',
        severity: ValidationSeverity.WARNING,
        message: 'Organization name is very generic',
        suggestion: 'Try to extract a more specific organization name',
        code: 'ORGANIZATION_GENERIC'
      });
    }

    return issues;
  }

  /**
   * Validate location field
   */
  private validateLocation(location: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!location) return issues;

    // Check for overly vague locations
    const vague = ['worldwide', 'global', 'international', 'various', 'multiple'];
    if (vague.some(v => location.toLowerCase().includes(v))) {
      issues.push({
        field: 'location',
        severity: ValidationSeverity.INFO,
        message: 'Location is quite vague',
        code: 'LOCATION_VAGUE'
      });
    }

    return issues;
  }

  /**
   * Validate tags field
   */
  private validateTags(tags: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (tags.length > 20) {
      issues.push({
        field: 'tags',
        severity: ValidationSeverity.WARNING,
        message: `Very high number of tags (${tags.length})`,
        suggestion: 'Consider limiting to the most relevant tags',
        code: 'TAGS_TOO_MANY'
      });
    }

    // Check for very short tags
    const shortTags = tags.filter(tag => tag.length < 3);
    if (shortTags.length > 0) {
      issues.push({
        field: 'tags',
        severity: ValidationSeverity.INFO,
        message: `${shortTags.length} tags are very short`,
        suggestion: 'Remove overly short or meaningless tags',
        code: 'TAGS_TOO_SHORT'
      });
    }

    return issues;
  }

  /**
   * Calculate quality metrics for the opportunity
   */
  private calculateQualityMetrics(data: OpportunityData, issues: ValidationIssue[]): QualityMetrics {
    // Completeness: percentage of optional fields filled
    const optionalFields = ['organization', 'deadline', 'amount', 'location', 'tags'];
    const filledOptional = optionalFields.filter(field => {
      const value = data[field as keyof OpportunityData];
      return value && (typeof value !== 'string' || value.trim() !== '') && (!Array.isArray(value) || value.length > 0);
    });
    const completeness = filledOptional.length / optionalFields.length;

    // Accuracy: inverse of validation issues (weighted by severity)
    const accuracyPenalty = issues.reduce((penalty, issue) => {
      switch (issue.severity) {
        case ValidationSeverity.CRITICAL: return penalty + 0.4;
        case ValidationSeverity.ERROR: return penalty + 0.3;
        case ValidationSeverity.WARNING: return penalty + 0.1;
        case ValidationSeverity.INFO: return penalty + 0.02;
        default: return penalty;
      }
    }, 0);
    const accuracy = Math.max(0, 1 - accuracyPenalty);

    // Relevance: based on content analysis
    const relevance = this.calculateRelevanceScore(data);

    // Freshness: based on how recent the data appears
    const freshness = this.calculateFreshnessScore(data);

    // Overall quality
    const overall = (completeness * 0.25) + (accuracy * 0.35) + (relevance * 0.25) + (freshness * 0.15);

    return {
      completeness: Math.round(completeness * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      relevance: Math.round(relevance * 100) / 100,
      freshness: Math.round(freshness * 100) / 100,
      overall: Math.round(overall * 100) / 100
    };
  }

  /**
   * Calculate relevance score for artist opportunities
   */
  private calculateRelevanceScore(data: OpportunityData): number {
    let score = 0.5; // Base score

    const title = data.title?.toLowerCase() || '';
    const description = data.description?.toLowerCase() || '';
    const tags = data.tags?.join(' ').toLowerCase() || '';
    const allText = `${title} ${description} ${tags}`;

    // Positive indicators for artist opportunities
    const positiveKeywords = [
      'artist', 'art', 'creative', 'grant', 'fellowship', 'residency', 'exhibition',
      'gallery', 'museum', 'studio', 'painting', 'sculpture', 'photography', 'digital art',
      'installation', 'performance', 'visual arts', 'fine arts', 'contemporary art',
      'emerging artist', 'professional development', 'artwork', 'portfolio', 'commission'
    ];

    positiveKeywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        score += 0.02;
      }
    });

    // Strong positive indicators
    const strongKeywords = ['artist grant', 'artist fellowship', 'art residency', 'artist opportunity'];
    strongKeywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        score += 0.1;
      }
    });

    // Negative indicators
    const negativeKeywords = [
      'software engineer', 'developer', 'programmer', 'accountant', 'lawyer',
      'medical', 'nurse', 'doctor', 'sales', 'marketing', 'finance'
    ];

    negativeKeywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        score -= 0.1;
      }
    });

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate freshness score based on deadlines and content
   */
  private calculateFreshnessScore(data: OpportunityData): number {
    let score = 0.7; // Base score

    if (data.deadline) {
      const now = new Date();
      const deadline = new Date(data.deadline);
      const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline < 0) {
        score = 0.1; // Past deadline
      } else if (daysUntilDeadline < 7) {
        score = 0.9; // Very fresh, deadline soon
      } else if (daysUntilDeadline < 30) {
        score = 0.8; // Fresh, reasonable time left
      } else if (daysUntilDeadline < 90) {
        score = 0.7; // Moderate freshness
      } else {
        score = 0.5; // Distant deadline
      }
    }

    return score;
  }

  /**
   * Get total number of validations performed
   */
  private getTotalValidations(): number {
    // This should match the number of validation checks performed
    return 15;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}