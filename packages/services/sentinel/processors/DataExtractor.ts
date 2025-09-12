import { OpportunityData, SourceType } from '../../../../apps/backend/src/types/discovery';
import * as cheerio from 'cheerio';

/**
 * Configuration for data extraction
 */
export interface ExtractionConfig {
  enabled: boolean;
  timeout: number;
  maxRetries: number;
  preserveHtml: boolean;
  extractImages: boolean;
  extractLinks: boolean;
}

/**
 * Raw input data that needs to be extracted
 */
export interface RawData {
  content: string;
  contentType: 'html' | 'json' | 'text' | 'xml';
  url?: string;
  metadata?: Record<string, any>;
}

/**
 * Extraction result with extracted data and metadata
 */
export interface ExtractionResult {
  success: boolean;
  data: Partial<OpportunityData> | null;
  errors: string[];
  processingTimeMs: number;
  metadata: {
    extractedFields: string[];
    contentLength: number;
    extractionMethod: string;
  };
}

/**
 * DataExtractor converts raw HTML/JSON to structured OpportunityData
 * Handles various input formats and extracts key opportunity information
 */
export class DataExtractor {
  private config: ExtractionConfig;

  constructor(config: Partial<ExtractionConfig> = {}) {
    this.config = {
      enabled: true,
      timeout: 10000,
      maxRetries: 2,
      preserveHtml: false,
      extractImages: true,
      extractLinks: true,
      ...config
    };
  }

  /**
   * Extract structured opportunity data from raw input
   */
  async extract(rawData: RawData, sourceType: SourceType = 'websearch'): Promise<ExtractionResult> {
    const startTime = Date.now();
    const result: ExtractionResult = {
      success: false,
      data: null,
      errors: [],
      processingTimeMs: 0,
      metadata: {
        extractedFields: [],
        contentLength: rawData.content.length,
        extractionMethod: 'unknown'
      }
    };

    try {
      if (!this.config.enabled) {
        throw new Error('DataExtractor is disabled');
      }

      // Validate input
      if (!rawData.content || rawData.content.trim().length === 0) {
        throw new Error('Empty or invalid content provided');
      }

      // Extract based on content type
      let extractedData: Partial<OpportunityData>;
      
      switch (rawData.contentType) {
        case 'html':
          extractedData = await this.extractFromHtml(rawData);
          result.metadata.extractionMethod = 'html';
          break;
        case 'json':
          extractedData = await this.extractFromJson(rawData);
          result.metadata.extractionMethod = 'json';
          break;
        case 'text':
          extractedData = await this.extractFromText(rawData);
          result.metadata.extractionMethod = 'text';
          break;
        case 'xml':
          extractedData = await this.extractFromXml(rawData);
          result.metadata.extractionMethod = 'xml';
          break;
        default:
          throw new Error(`Unsupported content type: ${rawData.contentType}`);
      }

      // Add source metadata
      extractedData.sourceType = sourceType;
      extractedData.sourceUrl = rawData.url;
      extractedData.sourceMetadata = {
        ...rawData.metadata,
        extractedAt: new Date().toISOString(),
        contentType: rawData.contentType,
        originalContentLength: rawData.content.length
      };

      result.data = extractedData;
      result.success = true;
      result.metadata.extractedFields = Object.keys(extractedData).filter(
        key => extractedData[key as keyof OpportunityData] !== undefined
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Extraction failed: ${errorMessage}`);
      console.error('DataExtractor error:', error);
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Extract data from HTML content using CSS selectors
   */
  private async extractFromHtml(rawData: RawData): Promise<Partial<OpportunityData>> {
    const $ = cheerio.load(rawData.content);
    const extracted: Partial<OpportunityData> = {};

    // Common patterns for opportunity data extraction
    const selectors = {
      title: [
        'h1', 'h2', '.title', '.opportunity-title', '.job-title', '.grant-title',
        '[data-title]', '.headline', '.main-title', 'title'
      ],
      organization: [
        '.organization', '.company', '.org', '.institution', '.sponsor',
        '[data-organization]', '.employer', '.foundation'
      ],
      description: [
        '.description', '.content', '.details', '.summary', '.overview',
        'p', '.job-description', '.grant-description', '.opportunity-description'
      ],
      deadline: [
        '.deadline', '.due-date', '.expires', '.application-deadline',
        '[data-deadline]', '.date', '.closing-date'
      ],
      amount: [
        '.amount', '.salary', '.grant-amount', '.funding', '.prize',
        '[data-amount]', '.compensation', '.award'
      ],
      location: [
        '.location', '.address', '.city', '.venue', '.place',
        '[data-location]', '.geographic-location'
      ]
    };

    // Extract title
    for (const selector of selectors.title) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        extracted.title = this.cleanText(element.text());
        break;
      }
    }

    // Extract organization
    for (const selector of selectors.organization) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        extracted.organization = this.cleanText(element.text());
        break;
      }
    }

    // Extract description (combine multiple paragraphs)
    let description = '';
    for (const selector of selectors.description) {
      const elements = $(selector);
      if (elements.length) {
        description = elements.map((_, el) => $(el).text()).get().join(' ').trim();
        if (description.length > 100) { // Prefer longer descriptions
          break;
        }
      }
    }
    if (description) {
      extracted.description = this.cleanText(description);
    }

    // Extract deadline
    for (const selector of selectors.deadline) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        const dateText = this.cleanText(element.text());
        const parsedDate = this.parseDate(dateText);
        if (parsedDate) {
          extracted.deadline = parsedDate;
          break;
        }
      }
    }

    // Extract amount
    for (const selector of selectors.amount) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        extracted.amount = this.cleanText(element.text());
        break;
      }
    }

    // Extract location
    for (const selector of selectors.location) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        extracted.location = this.cleanText(element.text());
        break;
      }
    }

    // Extract URL from current page or find application links
    if (rawData.url) {
      extracted.url = rawData.url;
    } else {
      const applyLink = $('a[href*="apply"], a[href*="application"], a[href*="submit"]').first();
      if (applyLink.length) {
        extracted.url = applyLink.attr('href') || '';
      }
    }

    // Extract tags from meta keywords or visible tags
    const tags: string[] = [];
    
    // From meta keywords
    const metaKeywords = $('meta[name="keywords"]').attr('content');
    if (metaKeywords) {
      tags.push(...metaKeywords.split(',').map(tag => tag.trim().toLowerCase()));
    }

    // From visible tag elements
    $('.tag, .tags, .category, .categories, .keyword, .keywords').each((_, el) => {
      const tagText = $(el).text().trim().toLowerCase();
      if (tagText) {
        tags.push(tagText);
      }
    });

    if (tags.length > 0) {
      extracted.tags = [...new Set(tags)]; // Remove duplicates
    }

    return extracted;
  }

  /**
   * Extract data from JSON content
   */
  private async extractFromJson(rawData: RawData): Promise<Partial<OpportunityData>> {
    try {
      const data = JSON.parse(rawData.content);
      const extracted: Partial<OpportunityData> = {};

      // Common JSON field mappings
      const fieldMappings = {
        title: ['title', 'name', 'opportunity_title', 'job_title', 'grant_title'],
        organization: ['organization', 'company', 'org', 'institution', 'sponsor', 'employer'],
        description: ['description', 'content', 'details', 'summary', 'overview', 'job_description'],
        url: ['url', 'link', 'apply_url', 'application_url', 'href'],
        deadline: ['deadline', 'due_date', 'expires', 'application_deadline', 'closing_date'],
        amount: ['amount', 'salary', 'grant_amount', 'funding', 'prize', 'compensation'],
        location: ['location', 'address', 'city', 'venue', 'place', 'geographic_location'],
        tags: ['tags', 'keywords', 'categories', 'skills', 'topics']
      };

      // Extract fields using various possible keys
      for (const [field, possibleKeys] of Object.entries(fieldMappings)) {
        for (const key of possibleKeys) {
          if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
            let value = data[key];
            
            if (field === 'deadline' && typeof value === 'string') {
              const parsedDate = this.parseDate(value);
              if (parsedDate) {
                extracted.deadline = parsedDate;
              }
            } else if (field === 'tags' && Array.isArray(value)) {
              extracted.tags = value.map(tag => String(tag).toLowerCase());
            } else {
              extracted[field as keyof OpportunityData] = String(value);
            }
            break;
          }
        }
      }

      // Handle nested objects (common in APIs)
      if (data.opportunity || data.job || data.grant) {
        const nestedData = data.opportunity || data.job || data.grant;
        const nestedExtracted = await this.extractFromJson({
          ...rawData,
          content: JSON.stringify(nestedData)
        });
        Object.assign(extracted, nestedExtracted);
      }

      return extracted;
    } catch (error) {
      throw new Error(`JSON parsing failed: ${error}`);
    }
  }

  /**
   * Extract data from plain text using pattern matching
   */
  private async extractFromText(rawData: RawData): Promise<Partial<OpportunityData>> {
    const text = rawData.content;
    const extracted: Partial<OpportunityData> = {};

    // Extract title from first line or headers
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      extracted.title = this.cleanText(lines[0]);
    }

    // Use the full text as description
    extracted.description = this.cleanText(text);

    // Extract URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern);
    if (urls && urls.length > 0) {
      extracted.url = urls[0];
    }

    // Extract dates
    const datePattern = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/g;
    const dates = text.match(datePattern);
    if (dates && dates.length > 0) {
      const parsedDate = this.parseDate(dates[0]);
      if (parsedDate) {
        extracted.deadline = parsedDate;
      }
    }

    // Extract money amounts
    const moneyPattern = /\$[\d,]+(?:\.\d{2})?|\d+k|\d+,\d+/g;
    const amounts = text.match(moneyPattern);
    if (amounts && amounts.length > 0) {
      extracted.amount = amounts[0];
    }

    return extracted;
  }

  /**
   * Extract data from XML content
   */
  private async extractFromXml(rawData: RawData): Promise<Partial<OpportunityData>> {
    // For XML, convert to pseudo-HTML and use HTML extraction
    const htmlContent = rawData.content
      .replace(/<\?xml.*?\?>/g, '')
      .replace(/<(\w+)([^>]*)\/>/g, '<$1$2></$1>'); // Self-closing tags

    return this.extractFromHtml({
      ...rawData,
      content: htmlContent,
      contentType: 'html'
    });
  }

  /**
   * Clean and normalize text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
  }

  /**
   * Parse various date formats
   */
  private parseDate(dateString: string): Date | null {
    try {
      // Clean the date string
      const cleaned = dateString
        .replace(/[^\d\-\/\s:]/g, '')
        .trim();

      const date = new Date(cleaned);
      
      // Validate the parsed date
      if (isNaN(date.getTime())) {
        return null;
      }

      // Check if date is reasonable (not too far in past or future)
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const fiveYearsFromNow = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());

      if (date < oneYearAgo || date > fiveYearsFromNow) {
        return null;
      }

      return date;
    } catch {
      return null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ExtractionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ExtractionConfig {
    return { ...this.config };
  }
}