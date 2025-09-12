import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  OpportunityData, 
  validateOpportunityData,
  opportunityDataSchema 
} from '../../../../apps/backend/src/types/discovery';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fieldValidation: Record<string, FieldValidationResult>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface FieldValidationResult {
  isValid: boolean;
  value: any;
  errors: string[];
  warnings: string[];
  sanitized?: any;
}

export interface DataQualityReport {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  qualityScore: number;
  commonIssues: Array<{
    issue: string;
    count: number;
    examples: string[];
  }>;
  fieldQuality: Record<string, {
    completeness: number;
    validity: number;
    consistency: number;
  }>;
}

export class DataValidationService {
  constructor(private prisma: PrismaClient) {}

  // =====================================
  // Single Record Validation
  // =====================================

  /**
   * Validate a single opportunity record
   */
  validateOpportunity(data: unknown): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fieldValidation: {}
    };

    try {
      // Basic schema validation
      const validatedData = validateOpportunityData(data);
      
      // Field-by-field validation
      result.fieldValidation.title = this.validateTitle(validatedData.title);
      result.fieldValidation.description = this.validateDescription(validatedData.description);
      result.fieldValidation.url = this.validateUrl(validatedData.url);
      result.fieldValidation.deadline = this.validateDeadline(validatedData.deadline);
      result.fieldValidation.amount = this.validateAmount(validatedData.amount);
      result.fieldValidation.tags = this.validateTags(validatedData.tags);
      result.fieldValidation.relevanceScore = this.validateRelevanceScore(validatedData.relevanceScore);

      // Collect all errors and warnings
      Object.values(result.fieldValidation).forEach(field => {
        field.errors.forEach(error => {
          result.errors.push({
            field: field.toString(),
            message: error,
            code: 'VALIDATION_ERROR',
            severity: 'error'
          });
        });
        
        field.warnings.forEach(warning => {
          result.warnings.push({
            field: field.toString(),
            message: warning
          });
        });
      });

      // Business logic validation
      this.validateBusinessRules(validatedData, result);

      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.isValid = false;
      result.errors.push({
        field: 'general',
        message: `Validation failed: ${error}`,
        code: 'SCHEMA_ERROR',
        severity: 'error'
      });
    }

    return result;
  }

  /**
   * Validate and sanitize opportunity data
   */
  sanitizeOpportunity(data: unknown): { 
    sanitized?: OpportunityData; 
    validation: ValidationResult 
  } {
    const validation = this.validateOpportunity(data);
    
    if (!validation.isValid) {
      return { validation };
    }

    try {
      const validated = validateOpportunityData(data);
      const sanitized: OpportunityData = {
        ...validated,
        title: this.sanitizeTitle(validated.title),
        description: this.sanitizeDescription(validated.description),
        url: this.sanitizeUrl(validated.url),
        tags: this.sanitizeTags(validated.tags),
        organization: validated.organization ? this.sanitizeOrganization(validated.organization) : undefined,
        location: validated.location ? this.sanitizeLocation(validated.location) : undefined
      };

      return { sanitized, validation };
    } catch (error) {
      validation.errors.push({
        field: 'general',
        message: `Sanitization failed: ${error}`,
        code: 'SANITIZATION_ERROR',
        severity: 'error'
      });
      
      return { validation };
    }
  }

  // =====================================
  // Field-Specific Validation
  // =====================================

  private validateTitle(title: string): FieldValidationResult {
    const result: FieldValidationResult = {
      isValid: true,
      value: title,
      errors: [],
      warnings: []
    };

    if (!title || title.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Title is required');
    } else if (title.length < 10) {
      result.warnings.push('Title seems very short - consider adding more descriptive text');
    } else if (title.length > 500) {
      result.warnings.push('Title is very long - consider shortening for better readability');
    }

    // Check for common issues
    if (title.includes('undefined') || title.includes('null')) {
      result.isValid = false;
      result.errors.push('Title contains invalid placeholder text');
    }

    if (title.toUpperCase() === title && title.length > 20) {
      result.warnings.push('Title is all caps - consider using proper case');
    }

    return result;
  }

  private validateDescription(description: string): FieldValidationResult {
    const result: FieldValidationResult = {
      isValid: true,
      value: description,
      errors: [],
      warnings: []
    };

    if (!description || description.trim().length === 0) {
      result.isValid = false;
      result.errors.push('Description is required');
    } else if (description.length < 50) {
      result.warnings.push('Description seems very short - more details would be helpful');
    } else if (description.length > 5000) {
      result.warnings.push('Description is very long - consider summarizing key points');
    }

    return result;
  }

  private validateUrl(url: string): FieldValidationResult {
    const result: FieldValidationResult = {
      isValid: true,
      value: url,
      errors: [],
      warnings: []
    };

    try {
      new URL(url);
      
      // Check for common URL issues
      if (!url.startsWith('https://')) {
        result.warnings.push('URL uses HTTP instead of HTTPS - security concern');
      }
      
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        result.isValid = false;
        result.errors.push('URL points to localhost - not accessible publicly');
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push('Invalid URL format');
    }

    return result;
  }

  private validateDeadline(deadline?: Date): FieldValidationResult {
    const result: FieldValidationResult = {
      isValid: true,
      value: deadline,
      errors: [],
      warnings: []
    };

    if (deadline) {
      const now = new Date();
      
      if (deadline < now) {
        result.warnings.push('Deadline is in the past');
      }
      
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(now.getFullYear() + 1);
      
      if (deadline > oneYearFromNow) {
        result.warnings.push('Deadline is more than a year away');
      }
    }

    return result;
  }

  private validateAmount(amount?: string): FieldValidationResult {
    const result: FieldValidationResult = {
      isValid: true,
      value: amount,
      errors: [],
      warnings: []
    };

    if (amount) {
      // Check if it looks like a monetary amount
      const amountPattern = /^[\$€£¥]?[\d,]+(\.\d{2})?$/;
      if (!amountPattern.test(amount.trim())) {
        result.warnings.push('Amount format may not be standardized');
      }
    }

    return result;
  }

  private validateTags(tags: string[]): FieldValidationResult {
    const result: FieldValidationResult = {
      isValid: true,
      value: tags,
      errors: [],
      warnings: []
    };

    if (tags.length === 0) {
      result.warnings.push('No tags specified - consider adding relevant tags');
    } else if (tags.length > 20) {
      result.warnings.push('Many tags specified - consider using fewer, more specific tags');
    }

    // Check for duplicate tags
    const uniqueTags = new Set(tags.map(tag => tag.toLowerCase()));
    if (uniqueTags.size !== tags.length) {
      result.warnings.push('Duplicate tags detected');
    }

    return result;
  }

  private validateRelevanceScore(score?: number): FieldValidationResult {
    const result: FieldValidationResult = {
      isValid: true,
      value: score,
      errors: [],
      warnings: []
    };

    if (score !== undefined) {
      if (score < 0 || score > 1) {
        result.isValid = false;
        result.errors.push('Relevance score must be between 0 and 1');
      }
    }

    return result;
  }

  // =====================================
  // Business Rules Validation
  // =====================================

  private validateBusinessRules(data: OpportunityData, result: ValidationResult): void {
    // Rule: If deadline is very soon, relevance should be high
    if (data.deadline && data.relevanceScore) {
      const daysUntilDeadline = Math.ceil(
        (data.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilDeadline <= 7 && data.relevanceScore < 0.7) {
        result.warnings.push({
          field: 'relevanceScore',
          message: 'Low relevance score for opportunity with approaching deadline',
          suggestion: 'Consider reviewing the relevance calculation'
        });
      }
    }

    // Rule: Art-related opportunities should have relevant tags
    const artKeywords = ['art', 'artist', 'creative', 'gallery', 'exhibition', 'residency'];
    const hasArtKeywords = artKeywords.some(keyword => 
      data.title.toLowerCase().includes(keyword) || 
      data.description.toLowerCase().includes(keyword)
    );
    
    if (hasArtKeywords && data.tags.length === 0) {
      result.warnings.push({
        field: 'tags',
        message: 'Art-related opportunity without relevant tags',
        suggestion: 'Consider adding tags like "art", "gallery", "exhibition", etc.'
      });
    }
  }

  // =====================================
  // Data Sanitization
  // =====================================

  private sanitizeTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-.,!?()]/g, '') // Remove special characters except basic punctuation
      .substring(0, 500); // Limit length
  }

  private sanitizeDescription(description: string): string {
    return description
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 5000); // Limit length
  }

  private sanitizeUrl(url: string): string {
    return url.trim().toLowerCase();
  }

  private sanitizeOrganization(org: string): string {
    return org
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 255);
  }

  private sanitizeLocation(location: string): string {
    return location
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 255);
  }

  private sanitizeTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .filter((tag, index, array) => array.indexOf(tag) === index) // Remove duplicates
      .slice(0, 20); // Limit number of tags
  }

  // =====================================
  // Batch Validation
  // =====================================

  /**
   * Generate data quality report for all opportunities
   */
  async generateDataQualityReport(): Promise<DataQualityReport> {
    const opportunities = await this.prisma.opportunity.findMany();
    
    let validRecords = 0;
    const issueTracker = new Map<string, number>();
    const fieldCompletion = {
      title: 0,
      description: 0,
      organization: 0,
      deadline: 0,
      amount: 0,
      location: 0,
      tags: 0,
      relevanceScore: 0
    };
    
    const fieldValidity = { ...fieldCompletion };

    for (const opp of opportunities) {
      const validation = this.validateOpportunity(opp);
      
      if (validation.isValid) {
        validRecords++;
      }

      // Track common issues
      validation.errors.forEach(error => {
        const key = `${error.field}: ${error.message}`;
        issueTracker.set(key, (issueTracker.get(key) || 0) + 1);
      });

      // Check field completion
      if (opp.title) fieldCompletion.title++;
      if (opp.description) fieldCompletion.description++;
      if (opp.organization) fieldCompletion.organization++;
      if (opp.deadline) fieldCompletion.deadline++;
      if (opp.amount) fieldCompletion.amount++;
      if (opp.location) fieldCompletion.location++;
      if (opp.tags && opp.tags.length > 0) fieldCompletion.tags++;
      if (opp.relevanceScore !== null) fieldCompletion.relevanceScore++;

      // Check field validity (simplified)
      if (opp.title && opp.title.length >= 10) fieldValidity.title++;
      if (opp.description && opp.description.length >= 50) fieldValidity.description++;
      if (opp.organization) fieldValidity.organization++;
      if (opp.deadline && opp.deadline > new Date()) fieldValidity.deadline++;
      if (opp.amount) fieldValidity.amount++;
      if (opp.location) fieldValidity.location++;
      if (opp.tags && opp.tags.length > 0) fieldValidity.tags++;
      if (opp.relevanceScore !== null && opp.relevanceScore >= 0 && opp.relevanceScore <= 1) {
        fieldValidity.relevanceScore++;
      }
    }

    const totalRecords = opportunities.length;
    const qualityScore = totalRecords > 0 ? (validRecords / totalRecords) * 100 : 100;

    // Convert issues map to sorted array
    const commonIssues = Array.from(issueTracker.entries())
      .map(([issue, count]) => ({
        issue,
        count,
        examples: [issue] // Could be expanded to show actual examples
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 issues

    // Calculate field quality metrics
    const fieldQuality: Record<string, { completeness: number; validity: number; consistency: number }> = {};
    
    Object.keys(fieldCompletion).forEach(field => {
      fieldQuality[field] = {
        completeness: totalRecords > 0 ? (fieldCompletion[field] / totalRecords) * 100 : 0,
        validity: totalRecords > 0 ? (fieldValidity[field] / totalRecords) * 100 : 0,
        consistency: 95 // Placeholder - would need more sophisticated calculation
      };
    });

    return {
      totalRecords,
      validRecords,
      invalidRecords: totalRecords - validRecords,
      qualityScore,
      commonIssues,
      fieldQuality
    };
  }

  /**
   * Validate multiple opportunities in batch
   */
  async validateBatch(opportunities: unknown[]): Promise<{
    validCount: number;
    invalidCount: number;
    results: Array<{
      index: number;
      validation: ValidationResult;
      sanitized?: OpportunityData;
    }>;
  }> {
    let validCount = 0;
    let invalidCount = 0;
    
    const results = opportunities.map((opp, index) => {
      const { sanitized, validation } = this.sanitizeOpportunity(opp);
      
      if (validation.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      return {
        index,
        validation,
        sanitized
      };
    });

    return {
      validCount,
      invalidCount,
      results
    };
  }
}