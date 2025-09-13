import { BaseSocialMediaScraper } from '../../core/BaseSocialMediaScraper';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { Browser, Page, BrowserContext } from 'playwright';
import { DataExtractor, RawData } from '../../processors/DataExtractor';
import { DataCleaner } from '../../processors/DataCleaner';

// Import new modular components
import { BrowserManager, BrowserInstance } from '../../utils/BrowserManager';
import { LinkedInAuthenticator, LinkedInCredentials } from '../../services/LinkedInAuthenticator';
import { LinkedInContentExtractor } from '../../utils/LinkedInContentExtractor';
import { LinkedInDataValidator } from '../../utils/LinkedInDataValidator';
import {
  LinkedInConfig,
  LinkedInContent,
  LinkedInSearchContext,
  SecurityChallenge,
  ScrapingMetrics
} from '../../types/linkedin.types';
import {
  LINKEDIN_SELECTORS,
  LINKEDIN_URLS,
  LINKEDIN_TIMING,
  LINKEDIN_SEARCH_TERMS,
  LINKEDIN_MONITORING,
  LINKEDIN_DEFAULT_CONFIG,
  LINKEDIN_BROWSER_CONFIG
} from '../../config/linkedin.config';

// Interfaces moved to types/linkedin.types.ts

/**
 * LinkedIn scraper for professional art opportunities
 * Focuses on LinkedIn posts, job postings, and opportunity announcements
 * 
 * Refactored to use modular components for better maintainability
 */
export class LinkedInDiscoverer extends BaseSocialMediaScraper {
  private config: LinkedInConfig;
  private dataExtractor: DataExtractor;
  private dataCleaner: DataCleaner;
  
  // New modular components
  private browserManager: BrowserManager;
  private authenticator: LinkedInAuthenticator;
  private contentExtractor: LinkedInContentExtractor;
  private dataValidator: LinkedInDataValidator;
  private currentBrowserInstance: BrowserInstance | null = null;

  constructor() {
    super(
      'linkedin',
      'social',
      '1.0.0',
      LINKEDIN_BROWSER_CONFIG,
      {
        requestsPerMinute: LINKEDIN_TIMING.requestsPerMinute,
        burstLimit: 5,
        cooldownPeriod: 60000,
        enableBackoff: true
      }
    );
    
    // Initialize configuration with defaults and environment variables
    this.config = {
      ...LINKEDIN_DEFAULT_CONFIG,
      sessionCookies: process.env.LINKEDIN_COOKIES,
      email: process.env.LINKEDIN_EMAIL,
      password: process.env.LINKEDIN_PASSWORD,
      searchTerms: LINKEDIN_SEARCH_TERMS.general,
      jobSearchTerms: LINKEDIN_SEARCH_TERMS.jobs,
      groupsToMonitor: LINKEDIN_MONITORING.groups,
      companiesPagesToMonitor: LINKEDIN_MONITORING.companies
    };

    // Initialize legacy processors
    this.dataExtractor = new DataExtractor(this.config.dataExtractor);
    this.dataCleaner = new DataCleaner(this.config.dataCleaner);
    
    // Initialize new modular components
    this.browserManager = new BrowserManager({
      maxInstances: 2,
      reuseInstances: true,
      instanceTimeout: 30 * 60 * 1000,
      enablePool: false // Disable for LinkedIn due to session management
    });
    
    this.authenticator = new LinkedInAuthenticator({
      email: this.config.email,
      password: this.config.password,
      sessionCookies: this.config.sessionCookies
    });
    
    this.contentExtractor = new LinkedInContentExtractor({
      extractEngagementMetrics: true,
      extractHashtags: true,
      extractMentions: true,
      extractLinks: true,
      maxContentLength: this.config.dataCleaner.maxDescriptionLength,
      timeout: LINKEDIN_TIMING.elementTimeout
    });
    
    this.dataValidator = new LinkedInDataValidator({
      enableStrictValidation: false,
      enableContentEnrichment: true,
      enableDuplicateDetection: true,
      minQualityScore: 60
    });
  }

  protected async onInitialize(): Promise<void> {
    this.logInfo('Initializing LinkedIn discoverer...');
    
    // Validate configuration
    if (this.config.loginRequired && !this.config.sessionCookies && (!this.config.email || !this.config.password)) {
      this.logWarning('LinkedIn credentials not provided, functionality will be limited');
    }

    // Initialize browser using browser manager
    await this.initializeBrowser();
    
    this.logInfo('LinkedIn discoverer initialized successfully');
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      const page = await this.ensurePage();

      // Check if we can access LinkedIn
      const response = await page.goto(LINKEDIN_URLS.base, {
        waitUntil: 'domcontentloaded',
        timeout: LINKEDIN_TIMING.elementTimeout
      });

      const isHealthy = response?.ok() || false;
      
      if (isHealthy && this.config.loginRequired) {
        // Additional check for authentication status
        const authValid = await this.authenticator.checkIfLoggedIn(page);
        return authValid;
      }
      
      return isHealthy;
    } catch (error) {
      this.logError('LinkedIn health check failed', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 100;

    this.logInfo(`Starting LinkedIn discovery (max results: ${maxResults})`);
    this.updateMetrics('search');

    try {
      // Ensure browser and authentication
      await this.ensurePage();
      
      if (this.config.loginRequired && !this.browserState.isAuthenticated) {
        await this.authenticate();
      }

      // Create LinkedIn-specific search context
      const searchContext: LinkedInSearchContext = {
        searchTerms: context?.searchTerms || this.config.searchTerms,
        maxResults
      };

      // Search for general posts about opportunities
      this.logInfo('Searching posts for opportunities...');
      const postOpportunities = await this.searchPosts(searchContext);
      opportunities.push(...postOpportunities);

      // Search job listings
      if (opportunities.length < maxResults) {
        this.logInfo('Searching job listings...');
        const jobOpportunities = await this.searchJobs(searchContext);
        opportunities.push(...jobOpportunities);
      }

      // Monitor specific groups
      if (opportunities.length < maxResults) {
        this.logInfo('Monitoring groups for opportunities...');
        const groupOpportunities = await this.monitorGroups();
        opportunities.push(...groupOpportunities);
      }

      // Monitor company pages
      if (opportunities.length < maxResults) {
        this.logInfo('Monitoring company pages...');
        const companyOpportunities = await this.monitorCompanyPages();
        opportunities.push(...companyOpportunities);
      }

      // Validate and clean results
      const validatedOpportunities = this.validateAndCleanOpportunities(opportunities);
      const finalOpportunities = validatedOpportunities.slice(0, maxResults);
      
      this.logInfo(`LinkedIn discovery completed: ${finalOpportunities.length} opportunities found`);
      return finalOpportunities;

    } catch (error) {
      this.logError('LinkedIn discovery failed', error);
      this.updateMetrics('extraction_fail', undefined, {
        type: 'extraction',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Initialize browser using the browser manager
   */
  protected async initializeBrowser(): Promise<void> {
    try {
      this.currentBrowserInstance = await this.browserManager.createBrowser({
        headless: this.config.useHeadless,
        ...LINKEDIN_BROWSER_CONFIG
      });
      
      this.browserState = this.browserManager.createBrowserState(this.currentBrowserInstance);
      
      this.logInfo('Browser initialized with stealth configuration');
    } catch (error) {
      this.logError('Failed to initialize browser', error);
      throw error;
    }
  }

  /**
   * Authenticate with LinkedIn using the authentication service
   */
  protected async authenticate(): Promise<void> {
    const page = await this.ensurePage();
    
    try {
      this.logInfo('Authenticating with LinkedIn...');
      
      const authResult = await this.authenticator.authenticate(page, this.browserState.context!);
      
      this.browserState.isAuthenticated = authResult.isAuthenticated;
      this.authStatus = authResult;
      
      if (authResult.isAuthenticated) {
        this.logInfo(`Successfully authenticated using ${authResult.method}`);
      } else {
        this.logWarning(`Authentication failed: ${authResult.error}`);
        if (this.config.loginRequired) {
          throw new Error(`LinkedIn authentication required but failed: ${authResult.error}`);
        }
      }
    } catch (error) {
      this.logError('Authentication failed', error);
      if (this.config.loginRequired) {
        throw error;
      }
    }
  }

  // Login functionality moved to LinkedInAuthenticator service

  /**
   * Check if currently authenticated
   */
  protected async isAuthenticated(): Promise<boolean> {
    const page = await this.ensurePage();
    return await this.authenticator.checkIfLoggedIn(page);
  }

  /**
   * Handle security challenges using the authentication service
   */
  protected async handleSecurityChallenge(): Promise<SecurityChallenge> {
    const page = await this.ensurePage();
    return await this.authenticator.handleSecurityChallenge(page);
  }

  /**
   * Search LinkedIn posts for opportunities using modular components
   */
  private async searchPosts(context: LinkedInSearchContext): Promise<OpportunityData[]> {
    const page = await this.ensurePage();
    const opportunities: OpportunityData[] = [];
    const searchTerms = context.searchTerms || this.config.searchTerms;

    for (const term of searchTerms) {
      if (opportunities.length >= this.config.maxPostsPerSearch) break;

      try {
        await this.enforceRateLimit();
        this.logInfo(`Searching posts for: "${term}"`);

        // Navigate to search results
        const searchUrl = LINKEDIN_URLS.contentSearch(term);
        await page.goto(searchUrl, { 
          waitUntil: 'networkidle', 
          timeout: LINKEDIN_TIMING.pageTimeout 
        });
        await this.delay(LINKEDIN_TIMING.postDelay);

        // Wait for search results
        await page.waitForSelector(LINKEDIN_SELECTORS.search.resultsContainer, { 
          timeout: LINKEDIN_TIMING.elementTimeout 
        });

        // Load more results
        await this.loadMoreSearchResults();

        // Extract posts using content extractor
        const postElements = await page.$$(LINKEDIN_SELECTORS.posts.updateText);
        this.logInfo(`Found ${postElements.length} posts for "${term}"`);

        // Process each post
        for (let i = 0; i < Math.min(postElements.length, this.config.maxPostsPerSearch); i++) {
          try {
            const extractionResult = await this.contentExtractor.extractPostContent(page, postElements[i]);
            
            if (extractionResult.success && extractionResult.content) {
              const opportunity = await this.convertContentToOpportunity(extractionResult.content);
              if (opportunity) {
                opportunities.push(opportunity);
                this.updateMetrics('extraction_success', 'post');
              }
            } else {
              this.updateMetrics('skip');
              if (extractionResult.error) {
                this.logWarning(`Failed to extract post ${i + 1}: ${extractionResult.error}`);
              }
            }
          } catch (error) {
            this.updateMetrics('extraction_fail', 'post');
            this.logWarning(`Failed to extract post ${i + 1}`, error);
          }
        }

        // Rate limiting between searches
        await this.delay(LINKEDIN_TIMING.postDelay);

      } catch (error) {
        this.logError(`Failed to search posts for "${term}"`, error);
      }
    }

    return opportunities;
  }

  /**
   * Search LinkedIn job listings using modular components
   */
  private async searchJobs(context: LinkedInSearchContext): Promise<OpportunityData[]> {
    const page = await this.ensurePage();
    const opportunities: OpportunityData[] = [];
    const searchTerms = context.searchTerms || this.config.jobSearchTerms;

    for (const term of searchTerms) {
      if (opportunities.length >= this.config.maxJobsPerSearch) break;

      try {
        await this.enforceRateLimit();
        this.logInfo(`Searching jobs for: "${term}"`);

        // Navigate to jobs search
        const jobsUrl = LINKEDIN_URLS.jobsSearch(term);
        await page.goto(jobsUrl, { 
          waitUntil: 'networkidle', 
          timeout: LINKEDIN_TIMING.pageTimeout 
        });
        await this.delay(LINKEDIN_TIMING.postDelay);

        // Wait for job results
        await page.waitForSelector(LINKEDIN_SELECTORS.jobs.searchResultsList, { 
          timeout: LINKEDIN_TIMING.elementTimeout 
        });

        // Load more results
        await this.loadMoreJobResults();

        // Extract job cards
        const jobElements = await page.$$(LINKEDIN_SELECTORS.jobs.jobCardContainer);
        this.logInfo(`Found ${jobElements.length} jobs for "${term}"`);

        // Process each job
        for (let i = 0; i < Math.min(jobElements.length, this.config.maxJobsPerSearch); i++) {
          try {
            const extractionResult = await this.contentExtractor.extractJobContent(page, jobElements[i]);
            
            if (extractionResult.success && extractionResult.content) {
              const opportunity = await this.convertContentToOpportunity(extractionResult.content);
              if (opportunity) {
                opportunities.push(opportunity);
                this.updateMetrics('extraction_success', 'job');
              }
            } else {
              this.updateMetrics('skip');
              if (extractionResult.error) {
                this.logWarning(`Failed to extract job ${i + 1}: ${extractionResult.error}`);
              }
            }
          } catch (error) {
            this.updateMetrics('extraction_fail', 'job');
            this.logWarning(`Failed to extract job ${i + 1}`, error);
          }
        }

        // Rate limiting between searches
        await this.delay(LINKEDIN_TIMING.postDelay);

      } catch (error) {
        this.logError(`Failed to search jobs for "${term}"`, error);
      }
    }

    return opportunities;
  }

  /**
   * Monitor specific LinkedIn groups
   */
  private async monitorGroups(): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    
    // Note: LinkedIn groups require membership and have restricted access
    // This is a placeholder for potential implementation
    console.log('Group monitoring is limited due to LinkedIn access restrictions');
    
    return opportunities;
  }

  /**
   * Monitor company pages using modular components
   */
  private async monitorCompanyPages(): Promise<OpportunityData[]> {
    const page = await this.ensurePage();
    const opportunities: OpportunityData[] = [];

    for (const companyId of this.config.companiesPagesToMonitor) {
      try {
        await this.enforceRateLimit();
        this.logInfo(`Monitoring company page: ${companyId}`);

        const companyUrl = LINKEDIN_URLS.companyPage(companyId);
        await page.goto(companyUrl, { 
          waitUntil: 'networkidle', 
          timeout: LINKEDIN_TIMING.pageTimeout 
        });
        await this.delay(LINKEDIN_TIMING.postDelay);

        // Extract company posts
        const postElements = await page.$$(LINKEDIN_SELECTORS.posts.updateText);
        
        // Process posts
        for (let i = 0; i < Math.min(postElements.length, this.config.maxCompanyPosts); i++) {
          try {
            const extractionResult = await this.contentExtractor.extractPostContent(page, postElements[i]);
            
            if (extractionResult.success && extractionResult.content) {
              // Check if content contains opportunity keywords
              const hasOpportunityKeywords = this.containsOpportunityKeywords(extractionResult.content.content);
              
              if (hasOpportunityKeywords) {
                const opportunity = await this.convertContentToOpportunity(extractionResult.content);
                if (opportunity) {
                  opportunities.push(opportunity);
                  this.updateMetrics('extraction_success', 'post');
                }
              } else {
                this.updateMetrics('skip');
              }
            }
          } catch (error) {
            this.updateMetrics('extraction_fail', 'post');
            this.logWarning(`Failed to extract company post ${i + 1}`, error);
          }
        }

        await this.delay(LINKEDIN_TIMING.postDelay);

      } catch (error) {
        this.logError(`Failed to monitor company ${companyId}`, error);
      }
    }

    return opportunities;
  }

  /**
   * Load more search results by scrolling
   */
  private async loadMoreSearchResults(): Promise<void> {
    const page = await this.ensurePage();

    try {
      let scrollAttempts = 0;
      const maxScrollAttempts = LINKEDIN_TIMING.maxScrollAttempts;

      while (scrollAttempts < maxScrollAttempts) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await this.delay(LINKEDIN_TIMING.scrollDelay);

        // Check for "Show more results" button
        const showMoreButton = await page.$(LINKEDIN_SELECTORS.search.showMoreButton);
        if (showMoreButton) {
          await showMoreButton.click();
          await this.delay(LINKEDIN_TIMING.scrollDelay);
        }

        scrollAttempts++;
      }

    } catch (error) {
      this.logWarning('Error loading more search results', error);
    }
  }

  /**
   * Load more job results
   */
  private async loadMoreJobResults(): Promise<void> {
    const page = await this.ensurePage();

    try {
      let scrollAttempts = 0;
      const maxScrollAttempts = LINKEDIN_TIMING.maxScrollAttempts;

      while (scrollAttempts < maxScrollAttempts) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await this.delay(LINKEDIN_TIMING.scrollDelay);

        // Check for "See more jobs" button
        const seeMoreButton = await page.$(LINKEDIN_SELECTORS.search.seeMoreJobsButton);
        if (seeMoreButton) {
          await seeMoreButton.click();
          await this.delay(LINKEDIN_TIMING.postDelay);
        }

        scrollAttempts++;
      }

    } catch (error) {
      this.logWarning('Error loading more job results', error);
    }
  }

  /**
   * Extract content from post element
   */
  private async extractPostContent(element: any): Promise<LinkedInContent | null> {
    if (!this.page) return null;

    try {
      const contentData = await this.page.evaluate((el) => {
        // Find the post container
        const postContainer = el.closest('.feed-shared-update-v2') || el.closest('.update-components-actor');
        if (!postContainer) return null;

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
          }
        }

        // Extract timestamp
        let publishedAt = new Date();
        if (timeElement) {
          const datetime = timeElement.getAttribute('datetime');
          if (datetime) {
            publishedAt = new Date(datetime);
          }
        }

        return {
          content,
          author,
          authorUrl: authorUrl.startsWith('/') ? `https://www.linkedin.com${authorUrl}` : authorUrl,
          authorTitle,
          contentUrl,
          publishedAt: publishedAt.toISOString()
        };
      }, element);

      if (!contentData || !contentData.content) {
        return null;
      }

      const linkedInContent: LinkedInContent = {
        id: this.generateContentId(contentData.contentUrl),
        type: 'post',
        title: this.extractTitle(contentData.content),
        content: contentData.content,
        author: contentData.author,
        authorTitle: contentData.authorTitle,
        authorUrl: contentData.authorUrl,
        contentUrl: contentData.contentUrl,
        publishedAt: new Date(contentData.publishedAt),
        hashtags: this.extractHashtags(contentData.content),
        mentions: this.extractMentions(contentData.content),
        externalLinks: this.extractLinksFromText(contentData.content)
      };

      return linkedInContent;

    } catch (error) {
      console.warn('Failed to extract post content:', error);
      return null;
    }
  }

  /**
   * Extract job content from job element
   */
  private async extractJobContent(element: any): Promise<LinkedInContent | null> {
    if (!this.page) return null;

    try {
      const jobData = await this.page.evaluate((el) => {
        // Extract job title
        const titleElement = el.querySelector('.job-card-list__title');
        const title = titleElement ? titleElement.textContent?.trim() || '' : '';

        // Extract company
        const companyElement = el.querySelector('.job-card-container__company-name');
        const company = companyElement ? companyElement.textContent?.trim() || '' : '';

        // Extract location
        const locationElement = el.querySelector('.job-card-container__metadata-item');
        const location = locationElement ? locationElement.textContent?.trim() : undefined;

        // Extract job URL
        const linkElement = el.querySelector('a[href*="/jobs/view/"]');
        let jobUrl = '';
        if (linkElement) {
          const href = linkElement.getAttribute('href') || '';
          jobUrl = href.startsWith('/') ? `https://www.linkedin.com${href}` : href;
        }

        // Extract description preview
        const descElement = el.querySelector('.job-card-list__summary');
        const description = descElement ? descElement.textContent?.trim() || '' : '';

        return {
          title,
          company,
          location,
          jobUrl,
          description
        };
      }, element);

      if (!jobData || !jobData.title) {
        return null;
      }

      const linkedInContent: LinkedInContent = {
        id: this.generateContentId(jobData.jobUrl),
        type: 'job',
        title: jobData.title,
        content: jobData.description,
        author: jobData.company,
        authorUrl: `https://www.linkedin.com/company/${jobData.company.toLowerCase().replace(/\s+/g, '-')}`,
        contentUrl: jobData.jobUrl,
        publishedAt: new Date(),
        location: jobData.location,
        company: jobData.company,
        hashtags: [],
        mentions: [],
        externalLinks: []
      };

      return linkedInContent;

    } catch (error) {
      console.warn('Failed to extract job content:', error);
      return null;
    }
  }

  /**
   * Convert LinkedIn content to opportunity
   */
  private async convertContentToOpportunity(content: LinkedInContent): Promise<OpportunityData | null> {
    try {
      const description = content.content || `${content.title} at ${content.company || content.author}`;
      
      const opportunity: OpportunityData = {
        title: content.title,
        description: description,
        url: content.contentUrl,
        organization: content.company || content.author,
        deadline: this.extractDeadline(description),
        location: content.location || this.extractLocation(description),
        amount: this.extractAmount(description),
        tags: [...content.hashtags, 'linkedin', 'social-media', 'professional'],
        sourceType: 'social',
        status: 'new',
        processed: false,
        applied: false,
        starred: false,
        sourceMetadata: {
          platform: 'linkedin',
          contentType: content.type,
          contentUrl: content.contentUrl,
          author: content.author,
          authorTitle: content.authorTitle,
          authorCompany: content.company,
          authorUrl: content.authorUrl,
          contentId: content.id,
          hashtags: content.hashtags,
          mentions: content.mentions,
          externalLinks: content.externalLinks,
          location: content.location,
          salary: content.salary,
          jobType: content.jobType,
          postedAt: content.publishedAt.toISOString(),
          discoveredAt: new Date().toISOString()
        }
      };

      return opportunity;

    } catch (error) {
      console.error('Failed to convert content to opportunity:', error);
      return null;
    }
  }

  /**
   * Generate content ID from URL
   */
  private generateContentId(url: string): string {
    if (!url) return Math.random().toString(36).substring(7);
    
    const match = url.match(/\/(\d+)/) || url.match(/activity-(\d+)/);
    return match ? match[1] : url.split('/').pop() || Math.random().toString(36).substring(7);
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.substring(1).toLowerCase());
  }

  /**
   * Extract mentions from text
   */
  private extractMentions(text: string): string[] {
    const mentions = text.match(/@\w+/g) || [];
    return mentions.map(mention => mention.substring(1));
  }

  /**
   * Extract URLs from text
   */
  private extractLinksFromText(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Extract title from content
   */
  private extractTitle(content: string): string {
    // Look for common patterns
    const patterns = [
      /(?:HIRING|OPPORTUNITY|POSITION|ROLE)[:\s]+([^.\n]{10,100})/i,
      /(?:we're looking for|seeking|hiring)[:\s]+([^.\n]{10,100})/i,
      /^([^.\n]{10,100})/
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: use first 100 chars
    return content.substring(0, 100).trim();
  }

  /**
   * Extract deadline from text
   */
  private extractDeadline(text: string): Date | undefined {
    const patterns = [
      /deadline[:\s]+([^.\n]+)/i,
      /apply by[:\s]+([^.\n]+)/i,
      /closes?[:\s]+([^.\n]+)/i,
      /due[:\s]+([^.\n]+)/i
    ];

    for (const pattern of patterns) {
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

  /**
   * Extract location from text
   */
  private extractLocation(text: string): string {
    const patterns = [
      /location[:\s]+([^.\n]+)/i,
      /based in[:\s]+([^.\n]+)/i,
      /(?:remote|on-site|hybrid|in)\s+([\w\s,]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * Extract salary/amount from text
   */
  private extractAmount(text: string): string {
    const patterns = [
      /\$[\d,]+(?:\.\d{2})?(?:k|,000)?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?(?:k|,000)?)?/gi,
      /€[\d,]+(?:\.\d{2})?(?:k|,000)?(?:\s*-\s*€[\d,]+(?:\.\d{2})?(?:k|,000)?)?/gi,
      /£[\d,]+(?:\.\d{2})?(?:k|,000)?(?:\s*-\s*£[\d,]+(?:\.\d{2})?(?:k|,000)?)?/gi,
      /(?:salary|compensation|pay)[:\s]+([^.\n]*\d+[^.\n]*)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return '';
  }

  /**
   * Check if content contains opportunity keywords
   */
  private containsOpportunityKeywords(text: string): boolean {
    const keywords = [
      'opportunity', 'hiring', 'position', 'role', 'job', 'career',
      'apply', 'join', 'looking for', 'seeking', 'grant', 'fellowship',
      'residency', 'internship', 'freelance', 'contract', 'opening'
    ];

    const textLower = text.toLowerCase();
    return keywords.some(keyword => textLower.includes(keyword));
  }

  /**
   * Check if the opportunity is valid
   */
  private isValidOpportunity(opportunity: OpportunityData): boolean {
    // Must have meaningful description
    if (!opportunity.description || opportunity.description.length < 30) {
      return false;
    }

    // Must have a URL
    if (!opportunity.url) {
      return false;
    }

    // Must contain opportunity-related keywords
    const opportunityKeywords = [
      'opportunity', 'position', 'role', 'job', 'hiring', 'apply',
      'join', 'career', 'grant', 'fellowship', 'residency', 'internship'
    ];
    
    const textToCheck = (opportunity.title + ' ' + opportunity.description).toLowerCase();
    const hasOpportunityKeywords = opportunityKeywords.some(keyword => 
      textToCheck.includes(keyword)
    );
    
    return hasOpportunityKeywords;
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected async onCleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  protected getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      rateLimit: LINKEDIN_TIMING.requestsPerMinute,
      timeout: LINKEDIN_TIMING.operationTimeout,
      retryAttempts: LINKEDIN_TIMING.retryAttempts
    };
  }
  
  /**
   * Get scraping metrics
   */
  public getScrapingMetrics(): ScrapingMetrics {
    return this.getMetrics();
  }
  
  /**
   * Update LinkedIn configuration
   */
  public updateConfiguration(newConfig: Partial<LinkedInConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    if (newConfig.dataExtractor) {
      this.contentExtractor.updateConfig(newConfig.dataExtractor);
    }
    
    if (newConfig.dataCleaner) {
      // Update data validator if needed
      this.dataValidator.updateConfig({
        minQualityScore: 60 // Default quality threshold
      });
    }
    
    this.logInfo('Configuration updated successfully');
  }
}