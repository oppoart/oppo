import { PrismaClient } from '@prisma/client';
import stringSimilarity from 'string-similarity';
import { OpportunityData } from '../scrapers/OrganizationScrapers';

export interface ValidationRule {
  name: string;
  type: 'required' | 'format' | 'length' | 'pattern' | 'custom';
  field: string;
  criteria: any;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: string[];
  cleanedData?: any;
}

export interface ValidationError {
  rule: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  originalValue?: any;
  suggestedValue?: any;
}

export interface DuplicateResult {
  isDuplicate: boolean;
  similarityScore: number;
  duplicateId?: string;
  duplicateUrl?: string;
  mergeStrategy?: 'keep-original' | 'keep-new' | 'merge-data';
  differences?: string[];
}

export interface CleaningResult {
  originalData: any;
  cleanedData: any;
  changesApplied: string[];
  qualityScore: number;
}

/**
 * Data Validation and Cleaning Pipeline
 */
export class DataValidationService {
  private prisma: PrismaClient;
  
  // Validation rules for opportunity data
  private validationRules: ValidationRule[] = [
    {
      name: 'title-required',
      type: 'required',
      field: 'title',
      criteria: { minLength: 10 },
      errorMessage: 'Title is required and must be at least 10 characters',
      severity: 'error'
    },
    {
      name: 'title-length',
      type: 'length',
      field: 'title',
      criteria: { minLength: 10, maxLength: 255 },
      errorMessage: 'Title must be between 10 and 255 characters',
      severity: 'error'
    },
    {
      name: 'description-required',
      type: 'required',
      field: 'description',
      criteria: { minLength: 50 },
      errorMessage: 'Description is required and must be at least 50 characters',
      severity: 'error'
    },
    {
      name: 'description-quality',
      type: 'length',
      field: 'description',
      criteria: { minLength: 100, maxLength: 5000 },
      errorMessage: 'Description should be between 100 and 5000 characters for better quality',
      severity: 'warning'
    },
    {
      name: 'url-format',
      type: 'format',
      field: 'url',
      criteria: { pattern: /^https?:\/\/.+/ },
      errorMessage: 'URL must be a valid HTTP/HTTPS URL',
      severity: 'error'
    },
    {
      name: 'deadline-future',
      type: 'custom',
      field: 'deadline',
      criteria: { validator: 'futureDateValidator' },
      errorMessage: 'Deadline must be in the future',
      severity: 'warning'
    },
    {
      name: 'email-format',
      type: 'format',
      field: 'contactEmail',
      criteria: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      errorMessage: 'Contact email must be a valid email address',
      severity: 'warning'
    },
    {
      name: 'art-relevance',
      type: 'custom',
      field: 'content',
      criteria: { validator: 'artRelevanceValidator' },
      errorMessage: 'Content must be relevant to art opportunities',
      severity: 'error'
    },
    {
      name: 'spam-detection',
      type: 'custom',
      field: 'content',
      criteria: { validator: 'spamDetectionValidator' },
      errorMessage: 'Content appears to be spam',
      severity: 'error'
    }
  ];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Validate opportunity data
   */
  async validateOpportunity(data: OpportunityData): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: string[] = [];
    let score = 100;

    for (const rule of this.validationRules) {
      const result = await this.applyValidationRule(data, rule);
      
      if (!result.isValid) {
        const error: ValidationError = {
          rule: rule.name,
          field: rule.field,
          message: rule.errorMessage,
          severity: rule.severity,
          originalValue: this.getFieldValue(data, rule.field),
          suggestedValue: result.suggestedValue
        };

        if (rule.severity === 'error') {
          errors.push(error);
          score -= 20;
        } else if (rule.severity === 'warning') {
          warnings.push(error);
          score -= 10;
        }

        if (result.suggestion) {
          suggestions.push(result.suggestion);
        }
      }
    }

    // Additional quality checks
    const qualityResults = this.performQualityChecks(data);
    score = Math.max(0, score - qualityResults.deductions);
    suggestions.push(...qualityResults.suggestions);

    const isValid = errors.length === 0;
    const finalScore = Math.max(0, Math.min(100, score));

    return {
      isValid,
      score: finalScore,
      errors,
      warnings,
      suggestions,
      cleanedData: isValid ? this.cleanOpportunityData(data) : undefined
    };
  }

  /**
   * Apply individual validation rule
   */
  private async applyValidationRule(data: any, rule: ValidationRule): Promise<{
    isValid: boolean;
    suggestedValue?: any;
    suggestion?: string;
  }> {
    const fieldValue = this.getFieldValue(data, rule.field);

    switch (rule.type) {
      case 'required':
        const isPresent = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
        const meetsMinLength = typeof fieldValue === 'string' && 
                             rule.criteria.minLength ? 
                             fieldValue.length >= rule.criteria.minLength : true;
        return { 
          isValid: isPresent && meetsMinLength,
          suggestion: !isPresent ? `Please provide a ${rule.field}` : undefined
        };

      case 'length':
        if (typeof fieldValue !== 'string') return { isValid: true };
        const { minLength = 0, maxLength = Infinity } = rule.criteria;
        const isValidLength = fieldValue.length >= minLength && fieldValue.length <= maxLength;
        return { 
          isValid: isValidLength,
          suggestedValue: !isValidLength && fieldValue.length > maxLength ? 
                         fieldValue.substring(0, maxLength) : undefined,
          suggestion: !isValidLength ? 
                     `${rule.field} should be between ${minLength} and ${maxLength} characters` : undefined
        };

      case 'format':
        if (!fieldValue) return { isValid: true }; // Optional field
        const pattern = rule.criteria.pattern;
        return { 
          isValid: pattern.test(fieldValue),
          suggestion: `Please check the format of ${rule.field}`
        };

      case 'custom':
        return await this.applyCustomValidator(fieldValue, rule.criteria.validator, data);

      default:
        return { isValid: true };
    }
  }

  /**
   * Apply custom validation functions
   */
  private async applyCustomValidator(value: any, validatorName: string, fullData: any): Promise<{
    isValid: boolean;
    suggestedValue?: any;
    suggestion?: string;
  }> {
    switch (validatorName) {
      case 'futureDateValidator':
        if (!value || !(value instanceof Date)) return { isValid: true };
        const isInFuture = value > new Date();
        return { 
          isValid: isInFuture,
          suggestion: !isInFuture ? 'Deadline appears to be in the past' : undefined
        };

      case 'artRelevanceValidator':
        const content = `${fullData.title || ''} ${fullData.description || ''}`.toLowerCase();
        const artKeywords = [
          'art', 'artist', 'artistic', 'exhibition', 'gallery', 'museum',
          'creative', 'visual', 'contemporary', 'fine art', 'painting',
          'sculpture', 'photography', 'installation', 'performance'
        ];
        const hasArtKeyword = artKeywords.some(keyword => content.includes(keyword));
        return { 
          isValid: hasArtKeyword,
          suggestion: !hasArtKeyword ? 'Content does not appear to be art-related' : undefined
        };

      case 'spamDetectionValidator':
        const spamIndicators = [
          'click here', 'free money', 'guaranteed income', 'act now',
          'limited time', 'call now', 'no experience required',
          'work from home', 'make money fast', 'get rich quick'
        ];
        const text = `${fullData.title || ''} ${fullData.description || ''}`.toLowerCase();
        const hasSpamIndicator = spamIndicators.some(indicator => text.includes(indicator));
        return { 
          isValid: !hasSpamIndicator,
          suggestion: hasSpamIndicator ? 'Content contains spam-like phrases' : undefined
        };

      default:
        return { isValid: true };
    }
  }

  /**
   * Perform additional quality checks
   */
  private performQualityChecks(data: OpportunityData): {
    deductions: number;
    suggestions: string[];
  } {
    let deductions = 0;
    const suggestions: string[] = [];

    // Check for organization presence
    if (!data.organization) {
      deductions += 5;
      suggestions.push('Consider adding organization information');
    }

    // Check for deadline presence
    if (!data.deadline) {
      deductions += 5;
      suggestions.push('Deadline information would improve quality');
    }

    // Check for amount/funding information
    if (!data.amount) {
      deductions += 3;
      suggestions.push('Funding amount information would be helpful');
    }

    // Check for location
    if (!data.location) {
      deductions += 3;
      suggestions.push('Location information would improve discoverability');
    }

    // Check for requirements
    if (!data.requirements || data.requirements.length === 0) {
      deductions += 5;
      suggestions.push('Application requirements would help users prepare');
    }

    // Check description quality
    if (data.description.length < 200) {
      deductions += 5;
      suggestions.push('More detailed description would improve quality');
    }

    // Check for contact information
    if (!data.contactEmail && !data.applicationUrl) {
      deductions += 10;
      suggestions.push('Contact information or application URL is important');
    }

    return { deductions, suggestions };
  }

  /**
   * Clean and normalize opportunity data
   */
  private cleanOpportunityData(data: OpportunityData): OpportunityData {
    const cleaned = { ...data };

    // Clean title
    if (cleaned.title) {
      cleaned.title = this.cleanText(cleaned.title);
      cleaned.title = cleaned.title.substring(0, 255);
    }

    // Clean description
    if (cleaned.description) {
      cleaned.description = this.cleanText(cleaned.description);
      cleaned.description = cleaned.description.substring(0, 2000);
    }

    // Clean organization name
    if (cleaned.organization) {
      cleaned.organization = this.cleanText(cleaned.organization);
      cleaned.organization = cleaned.organization.substring(0, 100);
    }

    // Clean location
    if (cleaned.location) {
      cleaned.location = this.cleanText(cleaned.location);
      cleaned.location = cleaned.location.substring(0, 100);
    }

    // Clean requirements
    if (cleaned.requirements) {
      cleaned.requirements = cleaned.requirements
        .map(req => this.cleanText(req))
        .filter(req => req.length > 10)
        .slice(0, 5);
    }

    // Clean and validate email
    if (cleaned.contactEmail) {
      cleaned.contactEmail = cleaned.contactEmail.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleaned.contactEmail)) {
        cleaned.contactEmail = undefined;
      }
    }

    // Normalize URL
    if (cleaned.url) {
      cleaned.url = cleaned.url.trim();
      if (!cleaned.url.startsWith('http')) {
        cleaned.url = `https://${cleaned.url}`;
      }
    }

    // Clean tags
    if (cleaned.tags) {
      cleaned.tags = cleaned.tags
        .map(tag => tag.toLowerCase().trim())
        .filter(tag => tag.length > 2)
        .slice(0, 10);
      cleaned.tags = [...new Set(cleaned.tags)]; // Remove duplicates
    }

    return cleaned;
  }

  /**
   * Clean text content
   */
  private cleanText(text: string): string {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n+/g, ' ') // Multiple newlines to space
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .trim();
  }

  /**
   * Check for duplicates
   */
  async checkForDuplicates(data: OpportunityData): Promise<DuplicateResult> {
    // Check URL duplicates first
    const urlDuplicate = await this.prisma.opportunity.findFirst({
      where: { url: data.url },
      select: { id: true, url: true, title: true }
    });

    if (urlDuplicate) {
      return {
        isDuplicate: true,
        similarityScore: 1.0,
        duplicateId: urlDuplicate.id,
        duplicateUrl: urlDuplicate.url,
        mergeStrategy: 'keep-original',
        differences: []
      };
    }

    // Check title similarity
    const recentOpportunities = await this.prisma.opportunity.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: { id: true, title: true, url: true, description: true, organization: true }
    });

    for (const existing of recentOpportunities) {
      const titleSimilarity = stringSimilarity.compareTwoStrings(
        data.title.toLowerCase(), 
        existing.title.toLowerCase()
      );

      // Check if titles are very similar
      if (titleSimilarity > 0.8) {
        const descriptionSimilarity = stringSimilarity.compareTwoStrings(
          data.description.toLowerCase().substring(0, 500),
          existing.description.toLowerCase().substring(0, 500)
        );

        const overallSimilarity = (titleSimilarity + descriptionSimilarity) / 2;

        if (overallSimilarity > 0.75) {
          const differences = this.identifyDifferences(data, existing);
          
          return {
            isDuplicate: true,
            similarityScore: overallSimilarity,
            duplicateId: existing.id,
            duplicateUrl: existing.url,
            mergeStrategy: this.determineMergeStrategy(data, existing, differences),
            differences
          };
        }
      }
    }

    return {
      isDuplicate: false,
      similarityScore: 0,
      mergeStrategy: 'keep-new'
    };
  }

  /**
   * Identify differences between opportunities
   */
  private identifyDifferences(newData: OpportunityData, existing: any): string[] {
    const differences: string[] = [];

    if (newData.deadline && !existing.deadline) {
      differences.push('New data has deadline information');
    }
    
    if (newData.amount && !existing.amount) {
      differences.push('New data has funding amount');
    }
    
    if (newData.location && !existing.location) {
      differences.push('New data has location information');
    }
    
    if (newData.contactEmail && !existing.contactEmail) {
      differences.push('New data has contact email');
    }

    if (newData.description.length > existing.description.length * 1.2) {
      differences.push('New data has more detailed description');
    }

    return differences;
  }

  /**
   * Determine merge strategy
   */
  private determineMergeStrategy(
    newData: OpportunityData, 
    existing: any, 
    differences: string[]
  ): DuplicateResult['mergeStrategy'] {
    if (differences.length > 2) {
      return 'merge-data'; // New data has significant additional information
    }
    
    if (differences.length > 0) {
      return 'keep-new'; // New data has some improvements
    }
    
    return 'keep-original'; // No significant improvements
  }

  /**
   * Batch validate opportunities
   */
  async validateBatch(opportunities: OpportunityData[]): Promise<{
    valid: { data: OpportunityData; result: ValidationResult }[];
    invalid: { data: OpportunityData; result: ValidationResult }[];
    duplicates: { data: OpportunityData; duplicate: DuplicateResult }[];
    statistics: {
      total: number;
      valid: number;
      invalid: number;
      duplicates: number;
      averageScore: number;
    };
  }> {
    const valid = [];
    const invalid = [];
    const duplicates = [];
    let totalScore = 0;

    for (const opportunity of opportunities) {
      try {
        // Check for duplicates first
        const duplicateCheck = await this.checkForDuplicates(opportunity);
        if (duplicateCheck.isDuplicate && duplicateCheck.mergeStrategy === 'keep-original') {
          duplicates.push({ data: opportunity, duplicate: duplicateCheck });
          continue;
        }

        // Validate data
        const validationResult = await this.validateOpportunity(opportunity);
        totalScore += validationResult.score;

        if (validationResult.isValid && validationResult.score >= 60) {
          valid.push({ data: opportunity, result: validationResult });
        } else {
          invalid.push({ data: opportunity, result: validationResult });
        }

      } catch (error) {
        console.error(`Validation failed for opportunity "${opportunity.title}":`, error);
        invalid.push({
          data: opportunity,
          result: {
            isValid: false,
            score: 0,
            errors: [{
              rule: 'validation-error',
              field: 'general',
              message: 'Validation process failed',
              severity: 'error'
            }],
            warnings: [],
            suggestions: []
          }
        });
      }
    }

    return {
      valid,
      invalid,
      duplicates,
      statistics: {
        total: opportunities.length,
        valid: valid.length,
        invalid: invalid.length,
        duplicates: duplicates.length,
        averageScore: opportunities.length > 0 ? totalScore / opportunities.length : 0
      }
    };
  }

  /**
   * Get field value from nested object
   */
  private getFieldValue(obj: any, fieldPath: string): any {
    if (fieldPath === 'content') {
      return `${obj.title || ''} ${obj.description || ''}`;
    }

    return fieldPath.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * Update validation rule
   */
  updateValidationRule(name: string, updates: Partial<ValidationRule>): boolean {
    const index = this.validationRules.findIndex(rule => rule.name === name);
    if (index !== -1) {
      this.validationRules[index] = { ...this.validationRules[index], ...updates };
      return true;
    }
    return false;
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalRules: number;
    rulesBySeverity: { error: number; warning: number; info: number };
  } {
    const rulesBySeverity = this.validationRules.reduce(
      (acc, rule) => {
        acc[rule.severity]++;
        return acc;
      },
      { error: 0, warning: 0, info: 0 }
    );

    return {
      totalRules: this.validationRules.length,
      rulesBySeverity
    };
  }
}

export const dataValidationService = new DataValidationService(new PrismaClient());