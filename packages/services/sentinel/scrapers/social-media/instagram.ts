import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { DataExtractor, RawData } from '../../processors/DataExtractor';
import { DataCleaner } from '../../processors/DataCleaner';

/**
 * Instagram scraper configuration
 */
interface InstagramConfig {
  username?: string;
  password?: string;
  hashtags: string[];
  maxPostsPerHashtag: number;
  sessionCookies?: string;
  useHeadless: boolean;
  scrollTimeout: number;
  postDelay: number;
}

/**
 * Instagram post data structure
 */
interface InstagramPost {
  id: string;
  caption: string;
  author: string;
  authorUrl: string;
  postUrl: string;
  timestamp: Date;
  imageUrl?: string;
  likes?: number;
  comments?: number;
  hashtags: string[];
  mentions: string[];
  externalLinks: string[];
}

/**
 * Instagram scraper for artist opportunities
 * Searches hashtags like #artistopportunity, #opencall, #artgrant, #residency
 */
export class InstagramDiscoverer extends BaseDiscoverer {
  private config: InstagramConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private dataExtractor: DataExtractor;
  private dataCleaner: DataCleaner;
  private isAuthenticated: boolean = false;

  constructor() {
    super('instagram', 'social', '1.0.0');
    
    this.config = {
      username: process.env.INSTAGRAM_USERNAME,
      password: process.env.INSTAGRAM_PASSWORD,
      hashtags: [
        'artistopportunity',
        'opencall',
        'artgrant',
        'artresidency',
        'callforartists',
        'artfunding',
        'artistgrant',
        'artcompetition',
        'artsubmission',
        'artopportunity'
      ],
      maxPostsPerHashtag: 20,
      sessionCookies: process.env.INSTAGRAM_COOKIES,
      useHeadless: false, // Instagram detection is aggressive
      scrollTimeout: 30000,
      postDelay: 2000
    };

    this.dataExtractor = new DataExtractor({
      enabled: true,
      timeout: 10000,
      extractImages: true,
      extractLinks: true
    });

    this.dataCleaner = new DataCleaner({
      enabled: true,
      maxTitleLength: 150,
      maxDescriptionLength: 2000
    });
  }

  protected async onInitialize(): Promise<void> {
    console.log('Initializing Instagram discoverer...');
    
    // Validate configuration
    if (!this.config.username || !this.config.password) {
      if (!this.config.sessionCookies) {
        console.warn('Instagram credentials not provided, limited functionality available');
      }
    }

    // Initialize browser
    await this.initializeBrowser();
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      if (!this.page) {
        return false;
      }

      // Check if we can access Instagram
      const response = await this.page.goto('https://www.instagram.com', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      return response?.ok() || false;
    } catch (error) {
      console.error('Instagram health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 100;
    const hashtags = context?.searchTerms || this.config.hashtags;

    console.log(`Starting Instagram discovery for hashtags: ${hashtags.join(', ')}`);

    try {
      // Ensure we're authenticated
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      // Search each hashtag
      for (const hashtag of hashtags) {
        if (opportunities.length >= maxResults) break;

        console.log(`Searching hashtag: #${hashtag}`);
        const posts = await this.searchHashtag(hashtag);
        
        // Convert posts to opportunities
        for (const post of posts) {
          if (opportunities.length >= maxResults) break;
          
          const opportunity = await this.convertPostToOpportunity(post);
          if (opportunity && this.isValidOpportunity(opportunity)) {
            opportunities.push(opportunity);
          }
        }

        // Rate limiting between hashtags
        await this.delay(this.config.postDelay);
      }

      console.log(`Instagram discovery completed: ${opportunities.length} opportunities found`);
      return opportunities;

    } catch (error) {
      console.error('Instagram discovery failed:', error);
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
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York'
      });

      // Add stealth scripts to avoid detection
      await this.context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
      });

      this.page = await this.context.newPage();

      // Handle dialog boxes
      this.page.on('dialog', async dialog => {
        await dialog.dismiss();
      });

    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * Authenticate with Instagram
   */
  private async authenticate(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      console.log('Authenticating with Instagram...');

      // Load cookies if available
      if (this.config.sessionCookies) {
        const cookies = JSON.parse(this.config.sessionCookies);
        await this.context?.addCookies(cookies);
        
        // Check if cookies are valid
        await this.page.goto('https://www.instagram.com');
        await this.delay(3000);
        
        const loggedIn = await this.checkIfLoggedIn();
        if (loggedIn) {
          this.isAuthenticated = true;
          console.log('Authenticated with session cookies');
          return;
        }
      }

      // Manual login if cookies failed or not available
      if (this.config.username && this.config.password) {
        await this.performLogin();
      } else {
        console.warn('No authentication method available, proceeding without login');
      }

    } catch (error) {
      console.error('Authentication failed:', error);
      // Continue without authentication - limited functionality
    }
  }

  /**
   * Perform manual login
   */
  private async performLogin(): Promise<void> {
    if (!this.page || !this.config.username || !this.config.password) {
      return;
    }

    try {
      await this.page.goto('https://www.instagram.com/accounts/login/');
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });

      // Fill login form
      await this.page.fill('input[name="username"]', this.config.username);
      await this.page.fill('input[name="password"]', this.config.password);
      
      // Submit form
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation
      await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
      
      // Check for 2FA or other prompts
      await this.handlePostLoginPrompts();
      
      // Save cookies for future use
      const cookies = await this.context?.cookies();
      if (cookies) {
        console.log('Login successful, saving session cookies');
        // You might want to save these cookies to a secure storage
      }

      this.isAuthenticated = true;
      console.log('Successfully logged in to Instagram');

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
      // Check for profile icon or other logged-in indicators
      const profileIcon = await this.page.$('svg[aria-label="Profile"]');
      return profileIcon !== null;
    } catch {
      return false;
    }
  }

  /**
   * Handle post-login prompts (2FA, save login info, etc.)
   */
  private async handlePostLoginPrompts(): Promise<void> {
    if (!this.page) return;

    try {
      // Handle "Save Your Login Info?" prompt
      const notNowButton = await this.page.$('button:has-text("Not Now")');
      if (notNowButton) {
        await notNowButton.click();
        await this.delay(2000);
      }

      // Handle "Turn on Notifications" prompt
      const notNowButton2 = await this.page.$('button:has-text("Not Now")');
      if (notNowButton2) {
        await notNowButton2.click();
        await this.delay(2000);
      }

    } catch (error) {
      console.warn('Error handling post-login prompts:', error);
    }
  }

  /**
   * Search for posts with a specific hashtag
   */
  private async searchHashtag(hashtag: string): Promise<InstagramPost[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const posts: InstagramPost[] = [];

    try {
      // Navigate to hashtag page
      const url = `https://www.instagram.com/explore/tags/${hashtag}/`;
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await this.delay(3000);

      // Check if hashtag exists
      const noPostsMessage = await this.page.$('text="No posts yet"');
      if (noPostsMessage) {
        console.log(`No posts found for hashtag: #${hashtag}`);
        return posts;
      }

      // Get recent posts (not top posts)
      const postElements = await this.page.$$('article a[href*="/p/"]');
      console.log(`Found ${postElements.length} posts for #${hashtag}`);

      // Extract post data
      for (let i = 0; i < Math.min(postElements.length, this.config.maxPostsPerHashtag); i++) {
        try {
          const postUrl = await postElements[i].getAttribute('href');
          if (!postUrl) continue;

          const fullUrl = `https://www.instagram.com${postUrl}`;
          const postData = await this.extractPostData(fullUrl);
          
          if (postData) {
            posts.push(postData);
          }

          // Rate limiting between posts
          await this.delay(1000 + Math.random() * 1000);

        } catch (error) {
          console.warn(`Failed to extract post ${i + 1}:`, error);
        }
      }

      return posts;

    } catch (error) {
      console.error(`Failed to search hashtag #${hashtag}:`, error);
      return posts;
    }
  }

  /**
   * Extract data from a single Instagram post
   */
  private async extractPostData(postUrl: string): Promise<InstagramPost | null> {
    if (!this.page) return null;

    try {
      // Open post in new tab to avoid navigation issues
      const newPage = await this.context?.newPage();
      if (!newPage) return null;

      await newPage.goto(postUrl, { waitUntil: 'networkidle', timeout: 20000 });
      await this.delay(2000);

      // Extract post data
      const postData: InstagramPost = {
        id: this.extractPostId(postUrl),
        postUrl: postUrl,
        caption: '',
        author: '',
        authorUrl: '',
        timestamp: new Date(),
        hashtags: [],
        mentions: [],
        externalLinks: []
      };

      // Extract caption
      const captionElement = await newPage.$('h1, [aria-label*="Caption"]');
      if (captionElement) {
        postData.caption = await captionElement.textContent() || '';
      }

      // Extract author
      const authorElement = await newPage.$('a[href^="/"][href$="/"]');
      if (authorElement) {
        postData.author = await authorElement.textContent() || '';
        const authorHref = await authorElement.getAttribute('href');
        if (authorHref) {
          postData.authorUrl = `https://www.instagram.com${authorHref}`;
        }
      }

      // Extract hashtags and mentions from caption
      postData.hashtags = this.extractHashtags(postData.caption);
      postData.mentions = this.extractMentions(postData.caption);
      postData.externalLinks = this.extractLinks(postData.caption);

      // Extract image URL
      const imageElement = await newPage.$('img[srcset]');
      if (imageElement) {
        const srcset = await imageElement.getAttribute('srcset');
        if (srcset) {
          const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
          postData.imageUrl = urls[urls.length - 1]; // Get highest resolution
        }
      }

      // Extract timestamp
      const timeElement = await newPage.$('time[datetime]');
      if (timeElement) {
        const datetime = await timeElement.getAttribute('datetime');
        if (datetime) {
          postData.timestamp = new Date(datetime);
        }
      }

      await newPage.close();
      return postData;

    } catch (error) {
      console.warn(`Failed to extract post data from ${postUrl}:`, error);
      return null;
    }
  }

  /**
   * Convert Instagram post to opportunity
   */
  private async convertPostToOpportunity(post: InstagramPost): Promise<OpportunityData | null> {
    try {
      // Extract opportunity information from caption
      const title = this.extractTitle(post.caption);
      const description = this.cleanDescription(post.caption);
      const deadline = this.extractDeadline(post.caption);
      const location = this.extractLocation(post.caption);
      const amount = this.extractAmount(post.caption);

      // Find external links (actual opportunity URLs)
      const opportunityUrl = post.externalLinks[0] || post.postUrl;

      const opportunity: OpportunityData = {
        title: title || `Opportunity from @${post.author}`,
        description: description,
        url: opportunityUrl,
        organization: post.author,
        deadline: deadline,
        location: location,
        amount: amount,
        tags: [...post.hashtags, 'instagram', 'social-media'],
        sourceType: 'social',
        status: 'new',
        processed: false,
        applied: false,
        starred: false,
        sourceMetadata: {
          platform: 'instagram',
          postUrl: post.postUrl,
          author: post.author,
          authorUrl: post.authorUrl,
          postId: post.id,
          imageUrl: post.imageUrl,
          hashtags: post.hashtags,
          mentions: post.mentions,
          postedAt: post.timestamp.toISOString(),
          discoveredAt: new Date().toISOString()
        }
      };

      return opportunity;

    } catch (error) {
      console.error('Failed to convert post to opportunity:', error);
      return null;
    }
  }

  /**
   * Extract post ID from URL
   */
  private extractPostId(url: string): string {
    const match = url.match(/\/p\/([^\/]+)/);
    return match ? match[1] : '';
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
  private extractLinks(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const links = text.match(urlRegex) || [];
    
    // Also check for link in bio references
    if (text.toLowerCase().includes('link in bio')) {
      // This would need additional logic to fetch the bio link
      console.log('Post references link in bio');
    }

    return links;
  }

  /**
   * Extract title from caption
   */
  private extractTitle(caption: string): string {
    // Look for common patterns
    const patterns = [
      /(?:CALL|OPPORTUNITY|GRANT|RESIDENCY)[:\s]+([^.\n]+)/i,
      /^([^.\n]{10,100})/,
      /(?:announcing|presenting|introducing)[:\s]+([^.\n]+)/i
    ];

    for (const pattern of patterns) {
      const match = caption.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: use first line or first 100 chars
    const firstLine = caption.split('\n')[0];
    return firstLine.substring(0, 100).trim();
  }

  /**
   * Clean description text
   */
  private cleanDescription(caption: string): string {
    // Remove excessive hashtags
    let cleaned = caption.replace(/(#\w+\s*){5,}/, '');
    
    // Remove emoji spam
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F6FF}]{3,}/gu, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Extract deadline from caption
   */
  private extractDeadline(caption: string): Date | undefined {
    const patterns = [
      /deadline[:\s]+([^.\n]+)/i,
      /due[:\s]+([^.\n]+)/i,
      /closes?[:\s]+([^.\n]+)/i,
      /submit by[:\s]+([^.\n]+)/i
    ];

    for (const pattern of patterns) {
      const match = caption.match(pattern);
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
   * Extract location from caption
   */
  private extractLocation(caption: string): string {
    const patterns = [
      /location[:\s]+([^.\n]+)/i,
      /based in[:\s]+([^.\n]+)/i,
      /(?:in|at)\s+([\w\s,]+(?:city|country|state))/i
    ];

    for (const pattern of patterns) {
      const match = caption.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * Extract amount/funding from caption
   */
  private extractAmount(caption: string): string {
    const patterns = [
      /\$[\d,]+(?:\.\d{2})?/,
      /€[\d,]+(?:\.\d{2})?/,
      /£[\d,]+(?:\.\d{2})?/,
      /(?:grant|funding|prize|award)[:\s]+([^.\n]*\d+[^.\n]*)/i
    ];

    for (const pattern of patterns) {
      const match = caption.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return '';
  }

  /**
   * Check if the opportunity is valid
   */
  private isValidOpportunity(opportunity: OpportunityData): boolean {
    // Must have meaningful description
    if (!opportunity.description || opportunity.description.length < 50) {
      return false;
    }

    // Must have a URL (either external or Instagram post)
    if (!opportunity.url) {
      return false;
    }

    // Filter out spam/promotional content
    const spamKeywords = ['follow', 'dm for', 'link in bio', 'swipe up', 'tag'];
    const descLower = opportunity.description.toLowerCase();
    const spamCount = spamKeywords.filter(keyword => descLower.includes(keyword)).length;
    if (spamCount >= 3) {
      return false;
    }

    return true;
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
      rateLimit: 20, // 20 requests per minute (very conservative for Instagram)
      timeout: 60000, // 60 seconds for operations
      retryAttempts: 2
    };
  }
}