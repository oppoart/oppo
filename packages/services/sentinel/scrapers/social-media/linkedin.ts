import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { DataExtractor, RawData } from '../../processors/DataExtractor';
import { DataCleaner } from '../../processors/DataCleaner';

/**
 * LinkedIn scraper configuration
 */
interface LinkedInConfig {
  sessionCookies?: string;
  email?: string;
  password?: string;
  searchTerms: string[];
  jobSearchTerms: string[];
  groupsToMonitor: string[];
  companiesPagesToMonitor: string[];
  maxPostsPerSearch: number;
  maxJobsPerSearch: number;
  useHeadless: boolean;
  scrollTimeout: number;
  postDelay: number;
  loginRequired: boolean;
}

/**
 * LinkedIn post/content data structure
 */
interface LinkedInContent {
  id: string;
  type: 'post' | 'job' | 'article';
  title: string;
  content: string;
  author: string;
  authorTitle?: string;
  authorCompany?: string;
  authorUrl: string;
  contentUrl: string;
  publishedAt: Date;
  likes?: number;
  comments?: number;
  shares?: number;
  hashtags: string[];
  mentions: string[];
  externalLinks: string[];
  location?: string;
  company?: string;
  salary?: string;
  jobType?: string;
  experience?: string;
}

/**
 * LinkedIn scraper for professional art opportunities
 * Focuses on LinkedIn posts, job postings, and opportunity announcements
 */
export class LinkedInDiscoverer extends BaseDiscoverer {
  private config: LinkedInConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private dataExtractor: DataExtractor;
  private dataCleaner: DataCleaner;
  private isAuthenticated: boolean = false;

  constructor() {
    super('linkedin', 'social', '1.0.0');
    
    this.config = {
      sessionCookies: process.env.LINKEDIN_COOKIES,
      email: process.env.LINKEDIN_EMAIL,
      password: process.env.LINKEDIN_PASSWORD,
      searchTerms: [
        'artist opportunity',
        'art grant',
        'creative residency',
        'museum job',
        'gallery position',
        'art director',
        'curator position',
        'arts administrator',
        'creative manager',
        'art fellowship',
        'cultural program',
        'nonprofit art'
      ],
      jobSearchTerms: [
        'artist',
        'curator',
        'art director',
        'creative director',
        'gallery manager',
        'museum',
        'arts',
        'creative',
        'design',
        'cultural'
      ],
      groupsToMonitor: [
        'arts-professionals',
        'museum-professionals',
        'art-gallery-professionals',
        'creative-professionals-network',
        'artists-network'
      ],
      companiesPagesToMonitor: [
        'metropolitan-museum-of-art',
        'moma',
        'guggenheim-museum',
        'whitney-museum',
        'lacma'
      ],
      maxPostsPerSearch: 20,
      maxJobsPerSearch: 50,
      useHeadless: false, // LinkedIn has sophisticated bot detection
      scrollTimeout: 30000,
      postDelay: 3000,
      loginRequired: true
    };

    this.dataExtractor = new DataExtractor({
      enabled: true,
      timeout: 10000,
      extractImages: false,
      extractLinks: true
    });

    this.dataCleaner = new DataCleaner({
      enabled: true,
      maxTitleLength: 200,
      maxDescriptionLength: 3000
    });
  }

  protected async onInitialize(): Promise<void> {
    console.log('Initializing LinkedIn discoverer...');
    
    // Validate configuration
    if (this.config.loginRequired && !this.config.sessionCookies && (!this.config.email || !this.config.password)) {
      console.warn('LinkedIn credentials not provided, functionality will be limited');
    }

    // Initialize browser
    await this.initializeBrowser();
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      if (!this.page) {
        return false;
      }

      // Check if we can access LinkedIn
      const response = await this.page.goto('https://www.linkedin.com', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      return response?.ok() || false;
    } catch (error) {
      console.error('LinkedIn health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 100;

    console.log(`Starting LinkedIn discovery (max results: ${maxResults})`);

    try {
      // Ensure we're authenticated
      if (this.config.loginRequired && !this.isAuthenticated) {
        await this.authenticate();
      }

      // Search for general posts about opportunities
      console.log('Searching posts for opportunities...');
      const postOpportunities = await this.searchPosts(context);
      opportunities.push(...postOpportunities);

      // Search job listings
      if (opportunities.length < maxResults) {
        console.log('Searching job listings...');
        const jobOpportunities = await this.searchJobs(context);
        opportunities.push(...jobOpportunities);
      }

      // Monitor specific groups
      if (opportunities.length < maxResults) {
        console.log('Monitoring groups for opportunities...');
        const groupOpportunities = await this.monitorGroups();
        opportunities.push(...groupOpportunities);
      }

      // Monitor company pages
      if (opportunities.length < maxResults) {
        console.log('Monitoring company pages...');
        const companyOpportunities = await this.monitorCompanyPages();
        opportunities.push(...companyOpportunities);
      }

      const finalOpportunities = opportunities.slice(0, maxResults);
      console.log(`LinkedIn discovery completed: ${finalOpportunities.length} opportunities found`);
      return finalOpportunities;

    } catch (error) {
      console.error('LinkedIn discovery failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Playwright browser
   */
  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: this.config.useHeadless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York'
      });

      // Add stealth scripts
      await this.context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
        
        // Override chrome object
        (window as any).chrome = {
          runtime: {}
        };
      });

      this.page = await this.context.newPage();

      // Handle dialogs
      this.page.on('dialog', async dialog => {
        await dialog.dismiss();
      });

    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * Authenticate with LinkedIn
   */
  private async authenticate(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      console.log('Authenticating with LinkedIn...');

      // Load cookies if available
      if (this.config.sessionCookies) {
        const cookies = JSON.parse(this.config.sessionCookies);
        await this.context?.addCookies(cookies);
        
        // Check if cookies are valid
        await this.page.goto('https://www.linkedin.com/feed');
        await this.delay(3000);
        
        const loggedIn = await this.checkIfLoggedIn();
        if (loggedIn) {
          this.isAuthenticated = true;
          console.log('Authenticated with session cookies');
          return;
        }
      }

      // Manual login if cookies failed or not available
      if (this.config.email && this.config.password) {
        await this.performLogin();
      } else {
        console.warn('No authentication method available, proceeding with limited access');
        // Continue without login - very limited functionality
      }

    } catch (error) {
      console.error('Authentication failed:', error);
    }
  }

  /**
   * Perform manual login
   */
  private async performLogin(): Promise<void> {
    if (!this.page || !this.config.email || !this.config.password) {
      return;
    }

    try {
      await this.page.goto('https://www.linkedin.com/login');
      await this.page.waitForSelector('#username', { timeout: 10000 });

      // Fill login form
      await this.page.fill('#username', this.config.email);
      await this.page.fill('#password', this.config.password);
      
      // Submit form
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation
      await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
      
      // Handle security check or challenge
      await this.handleSecurityCheck();
      
      this.isAuthenticated = true;
      console.log('Successfully logged in to LinkedIn');

    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Check if currently logged in
   */
  private async checkIfLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Check for profile icon or navigation elements
      const profileIcon = await this.page.$('button[aria-label="View profile"]');
      const feedExists = await this.page.$('.feed-container-theme');
      return profileIcon !== null || feedExists !== null;
    } catch {
      return false;
    }
  }

  /**
   * Handle security checks and challenges
   */
  private async handleSecurityCheck(): Promise<void> {
    if (!this.page) return;

    try {
      // Check for security challenge
      const challengeText = await this.page.$('text="Help us protect the LinkedIn community"');
      if (challengeText) {
        console.log('LinkedIn security challenge detected - manual intervention may be required');
        await this.delay(5000); // Give time for manual intervention
      }

      // Skip any onboarding or tour prompts
      const skipButton = await this.page.$('button:has-text("Skip")');
      if (skipButton) {
        await skipButton.click();
        await this.delay(2000);
      }

    } catch (error) {
      console.warn('Error handling security check:', error);
    }
  }

  /**
   * Search LinkedIn posts for opportunities
   */
  private async searchPosts(context?: DiscoveryContext): Promise<OpportunityData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const opportunities: OpportunityData[] = [];
    const searchTerms = context?.searchTerms || this.config.searchTerms;

    for (const term of searchTerms) {
      if (opportunities.length >= this.config.maxPostsPerSearch) break;

      try {
        console.log(`Searching posts for: "${term}"`);

        // Navigate to search results
        const encodedQuery = encodeURIComponent(term);
        const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodedQuery}&sortBy=%22date_posted%22`;
        
        await this.page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await this.delay(3000);

        // Wait for search results
        await this.page.waitForSelector('.search-results-container', { timeout: 10000 });

        // Load more results
        await this.loadMoreSearchResults();

        // Extract posts
        const postElements = await this.page.$$('.update-components-text');
        console.log(`Found ${postElements.length} posts for "${term}"`);

        // Process each post
        for (let i = 0; i < Math.min(postElements.length, this.config.maxPostsPerSearch); i++) {
          try {
            const contentData = await this.extractPostContent(postElements[i]);
            if (contentData) {
              const opportunity = await this.convertContentToOpportunity(contentData);
              if (opportunity && this.isValidOpportunity(opportunity)) {
                opportunities.push(opportunity);
              }
            }
          } catch (error) {
            console.warn(`Failed to extract post ${i + 1}:`, error);
          }
        }

        // Rate limiting between searches
        await this.delay(this.config.postDelay);

      } catch (error) {
        console.error(`Failed to search posts for "${term}":`, error);
      }
    }

    return opportunities;
  }

  /**
   * Search LinkedIn job listings
   */
  private async searchJobs(context?: DiscoveryContext): Promise<OpportunityData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const opportunities: OpportunityData[] = [];
    const searchTerms = context?.searchTerms || this.config.jobSearchTerms;

    for (const term of searchTerms) {
      if (opportunities.length >= this.config.maxJobsPerSearch) break;

      try {
        console.log(`Searching jobs for: "${term}"`);

        // Navigate to jobs search
        const encodedQuery = encodeURIComponent(term);
        const jobsUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}&sortBy=DD`;
        
        await this.page.goto(jobsUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await this.delay(3000);

        // Wait for job results
        await this.page.waitForSelector('.jobs-search__results-list', { timeout: 10000 });

        // Load more results
        await this.loadMoreJobResults();

        // Extract job cards
        const jobElements = await this.page.$$('.job-card-container');
        console.log(`Found ${jobElements.length} jobs for "${term}"`);

        // Process each job
        for (let i = 0; i < Math.min(jobElements.length, this.config.maxJobsPerSearch); i++) {
          try {
            const jobData = await this.extractJobContent(jobElements[i]);
            if (jobData) {
              const opportunity = await this.convertContentToOpportunity(jobData);
              if (opportunity && this.isValidOpportunity(opportunity)) {
                opportunities.push(opportunity);
              }
            }
          } catch (error) {
            console.warn(`Failed to extract job ${i + 1}:`, error);
          }
        }

        // Rate limiting between searches
        await this.delay(this.config.postDelay);

      } catch (error) {
        console.error(`Failed to search jobs for "${term}":`, error);
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
   * Monitor company pages
   */
  private async monitorCompanyPages(): Promise<OpportunityData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const opportunities: OpportunityData[] = [];

    for (const companyId of this.config.companiesPagesToMonitor) {
      try {
        console.log(`Monitoring company page: ${companyId}`);

        const companyUrl = `https://www.linkedin.com/company/${companyId}/posts/`;
        await this.page.goto(companyUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await this.delay(3000);

        // Extract company posts
        const postElements = await this.page.$$('.update-components-text');
        
        // Process posts
        for (let i = 0; i < Math.min(postElements.length, 10); i++) {
          try {
            const contentData = await this.extractPostContent(postElements[i]);
            if (contentData && this.containsOpportunityKeywords(contentData.content)) {
              const opportunity = await this.convertContentToOpportunity(contentData);
              if (opportunity && this.isValidOpportunity(opportunity)) {
                opportunities.push(opportunity);
              }
            }
          } catch (error) {
            console.warn(`Failed to extract company post ${i + 1}:`, error);
          }
        }

        await this.delay(this.config.postDelay);

      } catch (error) {
        console.error(`Failed to monitor company ${companyId}:`, error);
      }
    }

    return opportunities;
  }

  /**
   * Load more search results by scrolling
   */
  private async loadMoreSearchResults(): Promise<void> {
    if (!this.page) return;

    try {
      let scrollAttempts = 0;
      const maxScrollAttempts = 3;

      while (scrollAttempts < maxScrollAttempts) {
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await this.delay(2000);

        // Check for "Show more results" button
        const showMoreButton = await this.page.$('button:has-text("Show more results")');
        if (showMoreButton) {
          await showMoreButton.click();
          await this.delay(2000);
        }

        scrollAttempts++;
      }

    } catch (error) {
      console.warn('Error loading more search results:', error);
    }
  }

  /**
   * Load more job results
   */
  private async loadMoreJobResults(): Promise<void> {
    if (!this.page) return;

    try {
      let scrollAttempts = 0;
      const maxScrollAttempts = 3;

      while (scrollAttempts < maxScrollAttempts) {
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await this.delay(2000);

        // Check for "See more jobs" button
        const seeMoreButton = await this.page.$('button:has-text("See more jobs")');
        if (seeMoreButton) {
          await seeMoreButton.click();
          await this.delay(3000);
        }

        scrollAttempts++;
      }

    } catch (error) {
      console.warn('Error loading more job results:', error);
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
      rateLimit: 10, // 10 requests per minute (very conservative for LinkedIn)
      timeout: 90000, // 90 seconds for operations
      retryAttempts: 2
    };
  }
}