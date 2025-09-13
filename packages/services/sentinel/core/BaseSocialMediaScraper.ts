/**
 * Base Social Media Scraper
 * Abstract base class for all social media scrapers with common functionality
 */

import { BaseDiscoverer } from './BaseDiscoverer';
import { DiscoveryContext } from './interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { Browser, BrowserContext, Page } from 'playwright';
import {
  BrowserState,
  AuthenticationStatus,
  ScrapingMetrics,
  ScrapingError,
  SecurityChallenge,
  HealthCheckResult,
  RateLimitState,
  ContentValidationResult
} from '../types/linkedin.types';

/**
 * Browser initialization configuration
 */
export interface BrowserConfig {
  headless: boolean;
  viewport: { width: number; height: number };
  userAgent: string;
  locale: string;
  timezoneId: string;
  args: string[];
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  cooldownPeriod: number;
  enableBackoff: boolean;
}

/**
 * Abstract base class for social media scrapers
 */
export abstract class BaseSocialMediaScraper extends BaseDiscoverer {
  protected browserState: BrowserState = {
    browser: null,
    context: null,
    page: null,
    isAuthenticated: false
  };
  
  protected authStatus: AuthenticationStatus = {
    isAuthenticated: false,
    method: 'none',
    lastChecked: new Date()
  };

  protected metrics: ScrapingMetrics = {
    startTime: new Date(),
    searchOperations: 0,
    successfulExtractions: 0,
    failedExtractions: 0,
    skippedContent: 0,
    postsExtracted: 0,
    jobsExtracted: 0,
    articlesExtracted: 0,
    delaysTriggered: 0,
    totalDelayTime: 0,
    errors: [],
    warnings: []
  };

  protected rateLimitState: RateLimitState = {
    requestCount: 0,
    windowStart: new Date(),
    isLimited: false,
    backoffMultiplier: 1
  };

  constructor(
    name: string,
    type: string,
    version: string,
    protected browserConfig: BrowserConfig,
    protected rateLimitConfig: RateLimitConfig
  ) {
    super(name, type, version);
  }

  /**
   * Abstract methods that must be implemented by subclasses
   */
  protected abstract initializeBrowser(): Promise<void>;
  protected abstract authenticate(): Promise<void>;
  protected abstract handleSecurityChallenge(): Promise<SecurityChallenge>;
  
  /**
   * Browser management methods
   */
  protected async createBrowser(): Promise<void> {
    if (this.browserState.browser) {
      return;
    }

    await this.initializeBrowser();
    this.logInfo('Browser initialized successfully');
  }

  protected async closeBrowser(): Promise<void> {
    const { browser, context, page } = this.browserState;
    
    try {
      if (page) {
        await page.close();
      }
      if (context) {
        await context.close();
      }
      if (browser) {
        await browser.close();
      }
    } catch (error) {
      this.logError('Error closing browser', error);
    } finally {
      this.browserState = {
        browser: null,
        context: null,
        page: null,
        isAuthenticated: false
      };
    }
  }

  protected async ensurePage(): Promise<Page> {
    if (!this.browserState.page) {
      await this.createBrowser();
    }
    
    if (!this.browserState.page) {
      throw new Error('Failed to create page');
    }
    
    return this.browserState.page;
  }

  /**
   * Rate limiting methods
   */
  protected async enforceRateLimit(): Promise<void> {
    const now = new Date();
    const windowDuration = 60 * 1000; // 1 minute
    
    // Reset window if needed
    if (now.getTime() - this.rateLimitState.windowStart.getTime() > windowDuration) {
      this.rateLimitState.requestCount = 0;
      this.rateLimitState.windowStart = now;
      this.rateLimitState.backoffMultiplier = Math.max(1, this.rateLimitState.backoffMultiplier * 0.9);
    }

    // Check if rate limited
    if (this.rateLimitState.requestCount >= this.rateLimitConfig.requestsPerMinute) {
      const waitTime = windowDuration * this.rateLimitState.backoffMultiplier;
      this.rateLimitState.isLimited = true;
      this.rateLimitState.nextAllowedTime = new Date(now.getTime() + waitTime);
      
      this.logWarning(`Rate limit exceeded. Waiting ${waitTime}ms`);
      await this.delay(waitTime);
      
      this.rateLimitState.isLimited = false;
      this.rateLimitState.requestCount = 0;
      this.rateLimitState.windowStart = new Date();
    }

    this.rateLimitState.requestCount++;
  }

  /**
   * Authentication methods
   */
  protected async checkAuthentication(): Promise<boolean> {
    try {
      const isValid = await this.isAuthenticated();
      this.authStatus = {
        isAuthenticated: isValid,
        method: this.authStatus.method,
        lastChecked: new Date()
      };
      return isValid;
    } catch (error) {
      this.authStatus = {
        isAuthenticated: false,
        method: this.authStatus.method,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
      return false;
    }
  }

  protected abstract isAuthenticated(): Promise<boolean>;

  /**
   * Content validation methods
   */
  protected validateOpportunityContent(
    title: string,
    description: string,
    url: string,
    opportunityKeywords: string[]
  ): ContentValidationResult {
    const reasons: string[] = [];
    let score = 0;
    
    // Check required fields
    const hasRequiredFields = Boolean(title && description && url);
    if (!hasRequiredFields) {
      reasons.push('Missing required fields (title, description, or URL)');
    } else {
      score += 30;
    }

    // Check size requirements
    const meetsSizeRequirements = description.length >= 30 && title.length >= 10;
    if (!meetsSizeRequirements) {
      reasons.push('Content too short (description < 30 chars or title < 10 chars)');
    } else {
      score += 20;
    }

    // Check for opportunity keywords
    const textToCheck = (title + ' ' + description).toLowerCase();
    const hasOpportunityKeywords = opportunityKeywords.some(keyword => 
      textToCheck.includes(keyword.toLowerCase())
    );
    if (!hasOpportunityKeywords) {
      reasons.push('No opportunity keywords found');
    } else {
      score += 50;
    }

    const isValid = hasRequiredFields && meetsSizeRequirements && hasOpportunityKeywords;
    
    return {
      isValid,
      score,
      reasons,
      hasOpportunityKeywords,
      meetsSizeRequirements,
      hasRequiredFields
    };
  }

  /**
   * Utility methods
   */
  protected delay(ms: number): Promise<void> {
    this.metrics.delaysTriggered++;
    this.metrics.totalDelayTime += ms;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected generateId(input: string): string {
    if (!input) {
      return Math.random().toString(36).substring(7);
    }
    
    // Try to extract ID from URL patterns
    const patterns = [
      /\/(\d+)/,
      /activity-(\d+)/,
      /-(\d+)$/,
      /id=(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Fallback: use last part of URL or generate random
    return input.split('/').pop() || Math.random().toString(36).substring(7);
  }

  protected extractHashtags(text: string): string[] {
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.substring(1).toLowerCase());
  }

  protected extractMentions(text: string): string[] {
    const mentions = text.match(/@\w+/g) || [];
    return mentions.map(mention => mention.substring(1));
  }

  protected extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  protected extractTextFromPatterns(text: string, patterns: RegExp[]): string | undefined {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  protected parseDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;
    
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) ? date : undefined;
  }

  /**
   * Logging methods
   */
  protected logInfo(message: string, data?: any): void {
    console.log(`[${this.name}] ${message}`, data || '');
  }

  protected logWarning(message: string, data?: any): void {
    console.warn(`[${this.name}] WARNING: ${message}`, data || '');
    this.metrics.warnings.push(`${message} ${data ? JSON.stringify(data) : ''}`);
  }

  protected logError(message: string, error?: any): void {
    console.error(`[${this.name}] ERROR: ${message}`, error || '');
    
    const scrapingError: ScrapingError = {
      type: 'extraction', // default type
      message: message,
      stack: error?.stack,
      timestamp: new Date(),
      context: error ? { error: error.toString() } : undefined
    };
    
    this.metrics.errors.push(scrapingError);
  }

  /**
   * Health check implementation
   */
  protected async checkHealth(): Promise<boolean> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      isHealthy: false,
      browserReady: false,
      authenticationValid: false,
      lastCheck: new Date(),
      errors: [],
      responseTime: 0
    };

    try {
      // Check browser state
      result.browserReady = Boolean(
        this.browserState.browser && 
        this.browserState.context && 
        this.browserState.page
      );

      if (!result.browserReady) {
        result.errors.push('Browser not initialized');
      }

      // Check authentication if required
      if (this.browserState.page) {
        result.authenticationValid = await this.checkAuthentication();
        if (!result.authenticationValid) {
          result.errors.push('Authentication invalid');
        }
      }

      result.isHealthy = result.browserReady && result.authenticationValid;
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      result.responseTime = Date.now() - startTime;
    }

    return result.isHealthy;
  }

  /**
   * Metrics and monitoring
   */
  protected updateMetrics(
    operation: 'search' | 'extraction_success' | 'extraction_fail' | 'skip',
    contentType?: 'post' | 'job' | 'article',
    error?: ScrapingError
  ): void {
    switch (operation) {
      case 'search':
        this.metrics.searchOperations++;
        break;
      case 'extraction_success':
        this.metrics.successfulExtractions++;
        if (contentType === 'post') this.metrics.postsExtracted++;
        if (contentType === 'job') this.metrics.jobsExtracted++;
        if (contentType === 'article') this.metrics.articlesExtracted++;
        break;
      case 'extraction_fail':
        this.metrics.failedExtractions++;
        if (error) this.metrics.errors.push(error);
        break;
      case 'skip':
        this.metrics.skippedContent++;
        break;
    }
  }

  protected getMetrics(): ScrapingMetrics {
    return {
      ...this.metrics,
      endTime: new Date(),
      totalDuration: Date.now() - this.metrics.startTime.getTime()
    };
  }

  /**
   * Cleanup method
   */
  protected async onCleanup(): Promise<void> {
    await this.closeBrowser();
    this.logInfo('Cleanup completed');
  }
}