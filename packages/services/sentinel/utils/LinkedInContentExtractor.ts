/**
 * LinkedIn Content Extraction Utilities
 * Specialized utilities for extracting content from LinkedIn posts, jobs, and other elements
 */

import { Page, ElementHandle } from 'playwright';
import { 
  LinkedInContent, 
  ExtractedPostData, 
  ExtractedJobData,
  ContentExtractionResult,
  LinkedInContentType
} from '../types/linkedin.types';
import { LINKEDIN_SELECTORS, LINKEDIN_REGEX, LINKEDIN_URLS } from '../config/linkedin.config';

/**
 * Content extraction configuration
 */
export interface ExtractionConfig {
  extractEngagementMetrics: boolean;
  extractHashtags: boolean;
  extractMentions: boolean;
  extractLinks: boolean;
  maxContentLength: number;
  timeout: number;
}

/**
 * LinkedIn content extractor class
 */
export class LinkedInContentExtractor {
  private config: ExtractionConfig;

  constructor(config: Partial<ExtractionConfig> = {}) {
    this.config = {
      extractEngagementMetrics: true,
      extractHashtags: true,
      extractMentions: true,
      extractLinks: true,
      maxContentLength: 5000,
      timeout: 10000,
      ...config
    };
  }

  /**
   * Extract content from a post element
   */
  async extractPostContent(page: Page, element: ElementHandle): Promise<ContentExtractionResult> {
    try {
      const extractedData = await page.evaluate((el, selectors) => {
        // Find the post container
        const postContainer = el.closest('.feed-shared-update-v2') || 
                             el.closest('.update-components-actor');
        
        if (!postContainer) {
          return null;
        }

        // Extract text content
        const textElement = postContainer.querySelector('.update-components-text') || 
                           postContainer.querySelector('.feed-shared-text');
        const content = textElement ? textElement.textContent?.trim() || '' : '';

        // Extract author info
        const authorElement = postContainer.querySelector('.update-components-actor__meta a') ||
                             postContainer.querySelector('.feed-shared-actor__name a');
        const author = authorElement ? authorElement.textContent?.trim() || 'Unknown' : 'Unknown';
        const authorUrl = authorElement ? authorElement.getAttribute('href') || '' : '';

        // Extract author title/company
        const titleElement = postContainer.querySelector('.update-components-actor__description') ||
                            postContainer.querySelector('.feed-shared-actor__description');
        const authorTitle = titleElement ? titleElement.textContent?.trim() : undefined;

        // Extract post URL
        const timeElement = postContainer.querySelector('time');
        let contentUrl = '';
        if (timeElement && timeElement.parentElement) {
          const href = timeElement.parentElement.getAttribute('href') || '';
          if (href.startsWith('/')) {
            contentUrl = `https://www.linkedin.com${href}`;
          } else if (href) {
            contentUrl = href;
          }
        }

        // Extract timestamp
        let publishedAt = new Date().toISOString();
        if (timeElement) {
          const datetime = timeElement.getAttribute('datetime');
          if (datetime) {
            publishedAt = new Date(datetime).toISOString();
          }
        }

        // Extract engagement metrics
        let likes: number | undefined;
        let comments: number | undefined;
        let shares: number | undefined;

        const likeElement = postContainer.querySelector('[aria-label*="reaction"]');
        if (likeElement) {
          const likeText = likeElement.textContent || '';
          const likeMatch = likeText.match(/(\d+)/);
          if (likeMatch) {
            likes = parseInt(likeMatch[1], 10);
          }
        }

        const commentElement = postContainer.querySelector('[aria-label*="comment"]');
        if (commentElement) {
          const commentText = commentElement.textContent || '';
          const commentMatch = commentText.match(/(\d+)/);
          if (commentMatch) {
            comments = parseInt(commentMatch[1], 10);
          }
        }

        const shareElement = postContainer.querySelector('[aria-label*="share"]');
        if (shareElement) {
          const shareText = shareElement.textContent || '';
          const shareMatch = shareText.match(/(\d+)/);
          if (shareMatch) {
            shares = parseInt(shareMatch[1], 10);
          }
        }

        return {
          content,
          author,
          authorUrl: authorUrl.startsWith('/') ? `https://www.linkedin.com${authorUrl}` : authorUrl,
          authorTitle,
          contentUrl,
          publishedAt,
          likes,
          comments,
          shares
        };
      }, element, LINKEDIN_SELECTORS);

      if (!extractedData || !extractedData.content) {
        return {
          success: false,
          skipped: true,
          reason: 'No content found in post element'
        };
      }

      // Create LinkedIn content object
      const linkedInContent: LinkedInContent = {
        id: this.generateContentId(extractedData.contentUrl),
        type: 'post',
        title: this.extractTitle(extractedData.content),
        content: extractedData.content.substring(0, this.config.maxContentLength),
        author: extractedData.author,
        authorTitle: extractedData.authorTitle,
        authorUrl: extractedData.authorUrl,
        contentUrl: extractedData.contentUrl,
        publishedAt: new Date(extractedData.publishedAt),
        likes: extractedData.likes,
        comments: extractedData.comments,
        shares: extractedData.shares,
        hashtags: this.config.extractHashtags ? this.extractHashtags(extractedData.content) : [],
        mentions: this.config.extractMentions ? this.extractMentions(extractedData.content) : [],
        externalLinks: this.config.extractLinks ? this.extractLinks(extractedData.content) : []
      };

      return {
        success: true,
        content: linkedInContent
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Extract content from a job element
   */
  async extractJobContent(page: Page, element: ElementHandle): Promise<ContentExtractionResult> {
    try {
      const extractedData = await page.evaluate((el, selectors) => {
        // Extract job title
        const titleElement = el.querySelector('.job-card-list__title') ||
                            el.querySelector('.jobs-unified-top-card__job-title');
        const title = titleElement ? titleElement.textContent?.trim() || '' : '';

        // Extract company
        const companyElement = el.querySelector('.job-card-container__company-name') ||
                              el.querySelector('.jobs-unified-top-card__company-name');
        const company = companyElement ? companyElement.textContent?.trim() || '' : '';

        // Extract location
        const locationElement = el.querySelector('.job-card-container__metadata-item') ||
                               el.querySelector('.jobs-unified-top-card__bullet');
        const location = locationElement ? locationElement.textContent?.trim() : undefined;

        // Extract job URL
        const linkElement = el.querySelector('a[href*="/jobs/view/"]') ||
                           el.querySelector('a[data-job-id]');
        let jobUrl = '';
        if (linkElement) {
          const href = linkElement.getAttribute('href') || '';
          jobUrl = href.startsWith('/') ? `https://www.linkedin.com${href}` : href;
        }

        // Extract description preview
        const descElement = el.querySelector('.job-card-list__summary') ||
                           el.querySelector('.jobs-description-content');
        const description = descElement ? descElement.textContent?.trim() || '' : '';

        // Extract salary if available
        const salaryElement = el.querySelector('.job-card-container__salary-info') ||
                             el.querySelector('[data-test-id="salary"]');
        const salary = salaryElement ? salaryElement.textContent?.trim() : undefined;

        // Extract job type (full-time, part-time, etc.)
        const jobTypeElement = el.querySelector('.job-card-container__job-type') ||
                              el.querySelector('[data-test-id="job-type"]');
        const jobType = jobTypeElement ? jobTypeElement.textContent?.trim() : undefined;

        // Check for Easy Apply
        const easyApplyElement = el.querySelector('.jobs-apply-button--top-card') ||
                               el.querySelector('[data-test-id="easy-apply"]');
        const isEasyApply = easyApplyElement !== null;

        return {
          title,
          company,
          location,
          jobUrl,
          description,
          salary,
          jobType,
          isEasyApply
        };
      }, element, LINKEDIN_SELECTORS);

      if (!extractedData || !extractedData.title) {
        return {
          success: false,
          skipped: true,
          reason: 'No job title found in element'
        };
      }

      // Create LinkedIn content object for job
      const linkedInContent: LinkedInContent = {
        id: this.generateContentId(extractedData.jobUrl),
        type: 'job',
        title: extractedData.title,
        content: extractedData.description,
        author: extractedData.company,
        authorUrl: this.generateCompanyUrl(extractedData.company),
        contentUrl: extractedData.jobUrl,
        publishedAt: new Date(), // Jobs don't always have explicit post dates
        location: extractedData.location,
        company: extractedData.company,
        salary: extractedData.salary,
        jobType: extractedData.jobType,
        hashtags: [],
        mentions: [],
        externalLinks: []
      };

      return {
        success: true,
        content: linkedInContent
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Extract article content
   */
  async extractArticleContent(page: Page, element: ElementHandle): Promise<ContentExtractionResult> {
    try {
      const extractedData = await page.evaluate((el) => {
        // Find article container
        const articleContainer = el.closest('.feed-shared-article') || 
                               el.closest('.article-content');
        
        if (!articleContainer) {
          return null;
        }

        // Extract article title
        const titleElement = articleContainer.querySelector('.feed-shared-article__title') ||
                           articleContainer.querySelector('.article-title');
        const title = titleElement ? titleElement.textContent?.trim() || '' : '';

        // Extract article description
        const descElement = articleContainer.querySelector('.feed-shared-article__description') ||
                          articleContainer.querySelector('.article-description');
        const description = descElement ? descElement.textContent?.trim() || '' : '';

        // Extract article URL
        const linkElement = articleContainer.querySelector('a[href*="/pulse/"]') ||
                          articleContainer.querySelector('.article-link');
        let articleUrl = '';
        if (linkElement) {
          const href = linkElement.getAttribute('href') || '';
          articleUrl = href.startsWith('/') ? `https://www.linkedin.com${href}` : href;
        }

        // Extract author
        const authorElement = articleContainer.querySelector('.feed-shared-article__author') ||
                            articleContainer.querySelector('.article-author');
        const author = authorElement ? authorElement.textContent?.trim() || 'Unknown' : 'Unknown';

        return {
          title,
          description,
          articleUrl,
          author
        };
      }, element);

      if (!extractedData || !extractedData.title) {
        return {
          success: false,
          skipped: true,
          reason: 'No article title found'
        };
      }

      const linkedInContent: LinkedInContent = {
        id: this.generateContentId(extractedData.articleUrl),
        type: 'article',
        title: extractedData.title,
        content: extractedData.description,
        author: extractedData.author,
        authorUrl: '',
        contentUrl: extractedData.articleUrl,
        publishedAt: new Date(),
        hashtags: this.config.extractHashtags ? this.extractHashtags(extractedData.description) : [],
        mentions: this.config.extractMentions ? this.extractMentions(extractedData.description) : [],
        externalLinks: this.config.extractLinks ? this.extractLinks(extractedData.description) : []
      };

      return {
        success: true,
        content: linkedInContent
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Extract content based on detected type
   */
  async extractContent(page: Page, element: ElementHandle, contentType?: LinkedInContentType): Promise<ContentExtractionResult> {
    // Auto-detect content type if not provided
    if (!contentType) {
      contentType = await this.detectContentType(page, element);
    }

    switch (contentType) {
      case 'post':
        return await this.extractPostContent(page, element);
      case 'job':
        return await this.extractJobContent(page, element);
      case 'article':
        return await this.extractArticleContent(page, element);
      default:
        return {
          success: false,
          error: `Unsupported content type: ${contentType}`
        };
    }
  }

  /**
   * Detect content type from element
   */
  private async detectContentType(page: Page, element: ElementHandle): Promise<LinkedInContentType> {
    try {
      const contentType = await page.evaluate((el) => {
        // Check for job-specific elements
        if (el.querySelector('.job-card-container') || 
            el.querySelector('.jobs-unified-top-card') ||
            el.querySelector('[data-job-id]')) {
          return 'job';
        }

        // Check for article-specific elements
        if (el.querySelector('.feed-shared-article') || 
            el.querySelector('[href*="/pulse/"]')) {
          return 'article';
        }

        // Default to post
        return 'post';
      }, element);

      return contentType as LinkedInContentType;
    } catch (error) {
      console.warn('Failed to detect content type, defaulting to post:', error);
      return 'post';
    }
  }

  /**
   * Text extraction utilities
   */
  private extractTitle(content: string): string {
    if (!content) return '';

    // Try different patterns to extract a meaningful title
    for (const pattern of LINKEDIN_REGEX.title) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: use first 100 characters
    return content.substring(0, 100).trim();
  }

  private extractHashtags(text: string): string[] {
    if (!text) return [];
    
    const hashtags = text.match(LINKEDIN_REGEX.hashtags) || [];
    return hashtags.map(tag => tag.substring(1).toLowerCase());
  }

  private extractMentions(text: string): string[] {
    if (!text) return [];
    
    const mentions = text.match(LINKEDIN_REGEX.mentions) || [];
    return mentions.map(mention => mention.substring(1));
  }

  private extractLinks(text: string): string[] {
    if (!text) return [];
    
    return text.match(LINKEDIN_REGEX.urls) || [];
  }

  /**
   * Extract additional metadata from content
   */
  extractDeadline(text: string): Date | undefined {
    for (const pattern of LINKEDIN_REGEX.deadline) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    return undefined;
  }

  extractLocation(text: string): string {
    for (const pattern of LINKEDIN_REGEX.location) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  }

  extractSalary(text: string): string {
    for (const pattern of Object.values(LINKEDIN_REGEX.salary)) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    return '';
  }

  /**
   * Utility methods
   */
  private generateContentId(url: string): string {
    if (!url) {
      return Math.random().toString(36).substring(7);
    }
    
    // Extract ID from URL patterns
    const patterns = [
      /\/(\d+)/,
      /activity-(\d+)/,
      /-(\d+)$/,
      /id=(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Fallback: use last part of URL or generate random
    return url.split('/').pop() || Math.random().toString(36).substring(7);
  }

  private generateCompanyUrl(companyName: string): string {
    if (!companyName) return '';
    
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return `${LINKEDIN_URLS.base}/company/${slug}`;
  }

  /**
   * Batch extraction for multiple elements
   */
  async extractMultipleContents(
    page: Page, 
    elements: ElementHandle[], 
    contentType?: LinkedInContentType
  ): Promise<ContentExtractionResult[]> {
    const results: ContentExtractionResult[] = [];
    
    for (const element of elements) {
      try {
        const result = await this.extractContent(page, element, contentType);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return results;
  }

  /**
   * Update extraction configuration
   */
  updateConfig(newConfig: Partial<ExtractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ExtractionConfig {
    return { ...this.config };
  }
}