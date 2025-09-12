import { OpportunityData } from '../../../../apps/backend/src/types/discovery';

/**
 * Configuration for data cleaning
 */
export interface CleaningConfig {
  enabled: boolean;
  removeHtmlTags: boolean;
  normalizeWhitespace: boolean;
  normalizeDates: boolean;
  normalizeCurrency: boolean;
  maxTitleLength: number;
  maxDescriptionLength: number;
  removeEmptyFields: boolean;
  standardizeFormats: boolean;
}

/**
 * Cleaning result with cleaned data and metadata
 */
export interface CleaningResult {
  success: boolean;
  data: OpportunityData | null;
  errors: string[];
  processingTimeMs: number;
  metadata: {
    fieldsProcessed: string[];
    cleaningOperations: string[];
    originalDataSize: number;
    cleanedDataSize: number;
  };
}

/**
 * DataCleaner normalizes and cleans up extracted opportunity data
 * Handles text formatting, HTML removal, and data standardization
 */
export class DataCleaner {
  private config: CleaningConfig;

  constructor(config: Partial<CleaningConfig> = {}) {
    this.config = {
      enabled: true,
      removeHtmlTags: true,
      normalizeWhitespace: true,
      normalizeDates: true,
      normalizeCurrency: true,
      maxTitleLength: 200,
      maxDescriptionLength: 5000,
      removeEmptyFields: true,
      standardizeFormats: true,
      ...config
    };
  }

  /**
   * Clean and normalize opportunity data
   */
  async clean(data: Partial<OpportunityData>): Promise<CleaningResult> {
    const startTime = Date.now();
    const originalData = JSON.stringify(data);
    const operations: string[] = [];
    
    const result: CleaningResult = {
      success: false,
      data: null,
      errors: [],
      processingTimeMs: 0,
      metadata: {
        fieldsProcessed: [],
        cleaningOperations: [],
        originalDataSize: originalData.length,
        cleanedDataSize: 0
      }
    };

    try {
      if (!this.config.enabled) {
        throw new Error('DataCleaner is disabled');
      }

      // Create a copy to avoid mutating original data
      const cleanedData = { ...data } as OpportunityData;

      // Clean title
      if (cleanedData.title) {
        cleanedData.title = await this.cleanTitle(cleanedData.title);
        operations.push('title_cleaning');
        result.metadata.fieldsProcessed.push('title');
      }

      // Clean organization
      if (cleanedData.organization) {
        cleanedData.organization = await this.cleanOrganization(cleanedData.organization);
        operations.push('organization_cleaning');
        result.metadata.fieldsProcessed.push('organization');
      }

      // Clean description
      if (cleanedData.description) {
        cleanedData.description = await this.cleanDescription(cleanedData.description);
        operations.push('description_cleaning');
        result.metadata.fieldsProcessed.push('description');
      }

      // Clean and validate URL
      if (cleanedData.url) {
        cleanedData.url = await this.cleanUrl(cleanedData.url);
        operations.push('url_cleaning');
        result.metadata.fieldsProcessed.push('url');
      }

      // Clean amount (normalize currency format)
      if (cleanedData.amount) {
        cleanedData.amount = await this.cleanAmount(cleanedData.amount);
        operations.push('amount_cleaning');
        result.metadata.fieldsProcessed.push('amount');
      }

      // Clean location
      if (cleanedData.location) {
        cleanedData.location = await this.cleanLocation(cleanedData.location);
        operations.push('location_cleaning');
        result.metadata.fieldsProcessed.push('location');
      }

      // Clean tags
      if (cleanedData.tags && Array.isArray(cleanedData.tags)) {
        cleanedData.tags = await this.cleanTags(cleanedData.tags);
        operations.push('tags_cleaning');
        result.metadata.fieldsProcessed.push('tags');
      }

      // Clean notes
      if (cleanedData.notes) {
        cleanedData.notes = await this.cleanNotes(cleanedData.notes);
        operations.push('notes_cleaning');
        result.metadata.fieldsProcessed.push('notes');
      }

      // Normalize deadline
      if (cleanedData.deadline && this.config.normalizeDates) {
        cleanedData.deadline = await this.normalizeDate(cleanedData.deadline);
        operations.push('date_normalization');
        result.metadata.fieldsProcessed.push('deadline');
      }

      // Remove empty fields if configured
      if (this.config.removeEmptyFields) {
        this.removeEmptyFields(cleanedData);
        operations.push('empty_field_removal');
      }

      // Final validation
      if (!cleanedData.title || !cleanedData.description || !cleanedData.url) {
        throw new Error('Required fields (title, description, url) are missing after cleaning');
      }

      result.data = cleanedData;
      result.success = true;
      result.metadata.cleaningOperations = operations;
      result.metadata.cleanedDataSize = JSON.stringify(cleanedData).length;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Cleaning failed: ${errorMessage}`);
      console.error('DataCleaner error:', error);
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Clean and normalize title text
   */
  private async cleanTitle(title: string): Promise<string> {
    let cleaned = title;

    // Remove HTML tags
    if (this.config.removeHtmlTags) {
      cleaned = this.removeHtmlTags(cleaned);
    }

    // Normalize whitespace
    if (this.config.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    // Remove common prefixes/suffixes
    cleaned = cleaned
      .replace(/^(opportunity|job|position|grant|fellowship|award|competition)[:\s-]*/i, '')
      .replace(/\s*[-–—]\s*apply\s*(now|today)?\s*$/i, '')
      .replace(/\s*\|\s*.*$/g, '') // Remove everything after |
      .trim();

    // Capitalize properly
    cleaned = this.capitalizeTitle(cleaned);

    // Truncate if too long
    if (cleaned.length > this.config.maxTitleLength) {
      cleaned = cleaned.substring(0, this.config.maxTitleLength - 3) + '...';
    }

    return cleaned;
  }

  /**
   * Clean organization name
   */
  private async cleanOrganization(org: string): Promise<string> {
    let cleaned = org;

    // Remove HTML tags
    if (this.config.removeHtmlTags) {
      cleaned = this.removeHtmlTags(cleaned);
    }

    // Normalize whitespace
    if (this.config.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    // Remove common suffixes
    cleaned = cleaned
      .replace(/\s*[-–—]\s*jobs?$/i, '')
      .replace(/\s*[-–—]\s*careers?$/i, '')
      .replace(/\s*\|\s*.*$/g, '') // Remove everything after |
      .trim();

    return cleaned;
  }

  /**
   * Clean description text
   */
  private async cleanDescription(description: string): Promise<string> {
    let cleaned = description;

    // Remove HTML tags
    if (this.config.removeHtmlTags) {
      cleaned = this.removeHtmlTags(cleaned);
    }

    // Normalize whitespace
    if (this.config.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    // Remove excessive line breaks
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remove common footer text
    cleaned = cleaned
      .replace(/apply now.*$/i, '')
      .replace(/click here.*$/i, '')
      .replace(/learn more.*$/i, '')
      .trim();

    // Truncate if too long
    if (cleaned.length > this.config.maxDescriptionLength) {
      cleaned = cleaned.substring(0, this.config.maxDescriptionLength - 3) + '...';
    }

    return cleaned;
  }

  /**
   * Clean and validate URL
   */
  private async cleanUrl(url: string): Promise<string> {
    let cleaned = url.trim();

    // Add protocol if missing
    if (!cleaned.startsWith('http')) {
      cleaned = 'https://' + cleaned;
    }

    // Remove tracking parameters
    try {
      const urlObj = new URL(cleaned);
      
      // Common tracking parameters to remove
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'fbclid', 'gclid', 'ref', 'source', 'campaign_id'
      ];

      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });

      cleaned = urlObj.toString();
    } catch (error) {
      // If URL parsing fails, return as-is but log warning
      console.warn(`Invalid URL format: ${cleaned}`);
    }

    return cleaned;
  }

  /**
   * Clean amount/salary information
   */
  private async cleanAmount(amount: string): Promise<string> {
    let cleaned = amount;

    // Remove HTML tags
    if (this.config.removeHtmlTags) {
      cleaned = this.removeHtmlTags(cleaned);
    }

    // Normalize whitespace
    if (this.config.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    // Normalize currency format
    if (this.config.normalizeCurrency) {
      cleaned = this.normalizeCurrency(cleaned);
    }

    return cleaned.trim();
  }

  /**
   * Clean location information
   */
  private async cleanLocation(location: string): Promise<string> {
    let cleaned = location;

    // Remove HTML tags
    if (this.config.removeHtmlTags) {
      cleaned = this.removeHtmlTags(cleaned);
    }

    // Normalize whitespace
    if (this.config.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    // Standardize common location formats
    cleaned = cleaned
      .replace(/\b(remote|work from home|wfh)\b/gi, 'Remote')
      .replace(/\b(usa|united states|us)\b/gi, 'United States')
      .replace(/\b(uk|united kingdom)\b/gi, 'United Kingdom');

    return cleaned.trim();
  }

  /**
   * Clean and normalize tags
   */
  private async cleanTags(tags: string[]): Promise<string[]> {
    const cleaned: string[] = [];

    for (let tag of tags) {
      if (typeof tag !== 'string') {
        tag = String(tag);
      }

      // Clean individual tag
      let cleanedTag = tag.toLowerCase().trim();
      
      // Remove special characters
      cleanedTag = cleanedTag.replace(/[^\w\s-]/g, '');
      
      // Normalize whitespace
      cleanedTag = this.normalizeWhitespace(cleanedTag);

      // Skip if empty or too short
      if (cleanedTag.length < 2) {
        continue;
      }

      // Skip if too long
      if (cleanedTag.length > 50) {
        continue;
      }

      cleaned.push(cleanedTag);
    }

    // Remove duplicates and sort
    return [...new Set(cleaned)].sort();
  }

  /**
   * Clean notes
   */
  private async cleanNotes(notes: string): Promise<string> {
    let cleaned = notes;

    // Remove HTML tags
    if (this.config.removeHtmlTags) {
      cleaned = this.removeHtmlTags(cleaned);
    }

    // Normalize whitespace
    if (this.config.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    return cleaned.trim();
  }

  /**
   * Normalize date format
   */
  private async normalizeDate(date: Date): Promise<Date> {
    // Ensure it's a valid Date object
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Invalid date provided for normalization');
    }

    // Set time to end of day for deadlines
    const normalized = new Date(date);
    normalized.setHours(23, 59, 59, 999);

    return normalized;
  }

  /**
   * Remove HTML tags from text
   */
  private removeHtmlTags(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  /**
   * Normalize currency format
   */
  private normalizeCurrency(amount: string): string {
    return amount
      // Standardize currency symbols
      .replace(/USD?\s*/gi, '$')
      .replace(/EUR?\s*/gi, '€')
      .replace(/GBP?\s*/gi, '£')
      // Clean up spacing
      .replace(/\s*([,$€£])\s*/g, '$1')
      // Standardize number formatting
      .replace(/(\d),(\d{3})/g, '$1,$2')
      // Remove excessive decimal places
      .replace(/\.(\d{2})\d+/g, '.$1');
  }

  /**
   * Capitalize title properly
   */
  private capitalizeTitle(title: string): string {
    // Words that shouldn't be capitalized unless they're the first word
    const articles = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of', 'as'];
    
    return title
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        if (index === 0 || !articles.includes(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join(' ');
  }

  /**
   * Remove empty or null fields
   */
  private removeEmptyFields(data: OpportunityData): void {
    const fieldsToCheck = [
      'organization', 'amount', 'location', 'notes', 'sourceUrl'
    ];

    fieldsToCheck.forEach(field => {
      const value = data[field as keyof OpportunityData];
      if (value === null || value === undefined || 
          (typeof value === 'string' && value.trim() === '') ||
          (Array.isArray(value) && value.length === 0)) {
        delete data[field as keyof OpportunityData];
      }
    });

    // Clean tags array
    if (data.tags && Array.isArray(data.tags)) {
      data.tags = data.tags.filter(tag => tag && tag.trim());
      if (data.tags.length === 0) {
        delete data.tags;
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CleaningConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CleaningConfig {
    return { ...this.config };
  }
}