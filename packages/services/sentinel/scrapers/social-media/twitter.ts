import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { DataExtractor, RawData } from '../../processors/DataExtractor';
import { DataCleaner } from '../../processors/DataCleaner';

/**
 * Twitter API v2 configuration
 */
interface TwitterAPIConfig {
  bearerToken?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
}

/**
 * Twitter scraper configuration
 */
interface TwitterConfig {
  api: TwitterAPIConfig;
  searchTerms: string[];
  maxTweetsPerSearch: number;
  useAPI: boolean;
  useBrowserFallback: boolean;
  browserHeadless: boolean;
  rateLimit: {
    apiRequestsPerWindow: number;
    windowMinutes: number;
    browserDelay: number;
  };
}

/**
 * Twitter tweet data structure
 */
interface TwitterTweet {
  id: string;
  text: string;
  author: string;
  authorUsername: string;
  authorUrl: string;
  tweetUrl: string;
  createdAt: Date;
  retweets: number;
  likes: number;
  replies: number;
  hashtags: string[];
  mentions: string[];
  urls: string[];
  mediaUrls: string[];
  isRetweet: boolean;
  quotedTweetId?: string;
  repliedToTweetId?: string;
}

/**
 * Twitter/X scraper for artist opportunities
 * Searches for opportunity-related keywords and hashtags
 */
export class TwitterDiscoverer extends BaseDiscoverer {
  private config: TwitterConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private dataExtractor: DataExtractor;
  private dataCleaner: DataCleaner;
  private apiRequestCount: number = 0;
  private windowStartTime: number = Date.now();

  constructor() {
    super('twitter', 'social', '1.0.0');
    
    this.config = {
      api: {
        bearerToken: process.env.TWITTER_BEARER_TOKEN,
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
      },
      searchTerms: [
        'artist opportunity',
        'art grant',
        'art residency',
        'call for artists',
        'art competition',
        'art exhibition call',
        'artist fellowship',
        'art funding',
        'art submission',
        'creative grant',
        '#artistopportunity',
        '#artgrant',
        '#callforartists',
        '#artresidency',
        '#artfunding'
      ],
      maxTweetsPerSearch: 20,
      useAPI: !!process.env.TWITTER_BEARER_TOKEN,
      useBrowserFallback: true,
      browserHeadless: false, // X.com has strong bot detection
      rateLimit: {
        apiRequestsPerWindow: 100, // Conservative limit
        windowMinutes: 15,
        browserDelay: 3000
      }
    };

    this.dataExtractor = new DataExtractor({
      enabled: true,
      timeout: 10000,
      extractImages: false,
      extractLinks: true
    });

    this.dataCleaner = new DataCleaner({
      enabled: true,
      maxTitleLength: 280, // Twitter character limit
      maxDescriptionLength: 1000
    });
  }

  protected async onInitialize(): Promise<void> {
    console.log('Initializing Twitter discoverer...');
    
    // Determine discovery method
    if (this.config.useAPI && this.config.api.bearerToken) {
      console.log('Using Twitter API v2 for discovery');
    } else if (this.config.useBrowserFallback) {
      console.log('Using browser automation for discovery');
      await this.initializeBrowser();
    } else {
      throw new Error('No valid Twitter access method configured');
    }
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      if (this.config.useAPI && this.config.api.bearerToken) {
        return await this.checkAPIHealth();
      } else if (this.page) {
        return await this.checkBrowserHealth();
      }
      return false;
    } catch (error) {
      console.error('Twitter health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 100;
    const searchTerms = context?.searchTerms || this.config.searchTerms;

    console.log(`Starting Twitter discovery for terms: ${searchTerms.join(', ')}`);

    try {
      if (this.config.useAPI && this.config.api.bearerToken) {
        return await this.discoverWithAPI(searchTerms, maxResults);
      } else if (this.config.useBrowserFallback) {
        return await this.discoverWithBrowser(searchTerms, maxResults);
      } else {
        throw new Error('No discovery method available');
      }
    } catch (error) {
      console.error('Twitter discovery failed:', error);
      
      // Fallback to browser if API fails
      if (this.config.useAPI && this.config.useBrowserFallback) {
        console.log('API failed, falling back to browser automation');
        return await this.discoverWithBrowser(searchTerms, maxResults);
      }
      
      throw error;
    }
  }

  /**
   * Discover opportunities using Twitter API v2
   */
  private async discoverWithAPI(searchTerms: string[], maxResults: number): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    
    for (const term of searchTerms) {
      if (opportunities.length >= maxResults) break;
      
      console.log(`Searching API for: "${term}"`);
      
      // Check rate limit
      await this.checkAPIRateLimit();
      
      const tweets = await this.searchTweetsAPI(term);
      
      for (const tweet of tweets) {
        if (opportunities.length >= maxResults) break;
        
        const opportunity = await this.convertTweetToOpportunity(tweet);
        if (opportunity && this.isValidOpportunity(opportunity)) {
          opportunities.push(opportunity);
        }
      }
    }

    console.log(`Twitter API discovery completed: ${opportunities.length} opportunities found`);
    return opportunities;
  }

  /**
   * Discover opportunities using browser automation
   */
  private async discoverWithBrowser(searchTerms: string[], maxResults: number): Promise<OpportunityData[]> {
    if (!this.page) {
      await this.initializeBrowser();
    }

    const opportunities: OpportunityData[] = [];
    
    for (const term of searchTerms) {
      if (opportunities.length >= maxResults) break;
      
      console.log(`Searching browser for: "${term}"`);
      
      const tweets = await this.searchTweetsBrowser(term);
      
      for (const tweet of tweets) {
        if (opportunities.length >= maxResults) break;
        
        const opportunity = await this.convertTweetToOpportunity(tweet);
        if (opportunity && this.isValidOpportunity(opportunity)) {
          opportunities.push(opportunity);
        }
      }

      // Rate limiting between searches
      await this.delay(this.config.rateLimit.browserDelay);
    }

    console.log(`Twitter browser discovery completed: ${opportunities.length} opportunities found`);
    return opportunities;
  }

  /**
   * Search tweets using Twitter API v2
   */
  private async searchTweetsAPI(query: string): Promise<TwitterTweet[]> {
    if (!this.config.api.bearerToken) {
      throw new Error('Twitter Bearer Token not configured');
    }

    const tweets: TwitterTweet[] = [];

    try {
      const searchUrl = 'https://api.twitter.com/2/tweets/search/recent';
      const params = new URLSearchParams({
        query: `${query} -is:retweet lang:en`,
        max_results: Math.min(this.config.maxTweetsPerSearch, 100).toString(),
        'tweet.fields': 'id,text,author_id,created_at,public_metrics,context_annotations,entities',
        'user.fields': 'id,name,username,profile_image_url',
        expansions: 'author_id,attachments.media_keys,referenced_tweets.id',
        'media.fields': 'type,url,preview_image_url'
      });

      const response = await fetch(`${searchUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.config.api.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        console.log(`No tweets found for query: ${query}`);
        return tweets;
      }

      // Process tweets
      const users = data.includes?.users || [];
      const media = data.includes?.media || [];

      for (const tweetData of data.data) {
        const author = users.find((u: any) => u.id === tweetData.author_id);
        
        const tweet: TwitterTweet = {
          id: tweetData.id,
          text: tweetData.text,
          author: author?.name || 'Unknown',
          authorUsername: author?.username || 'unknown',
          authorUrl: author ? `https://twitter.com/${author.username}` : '',
          tweetUrl: `https://twitter.com/${author?.username || 'unknown'}/status/${tweetData.id}`,
          createdAt: new Date(tweetData.created_at),
          retweets: tweetData.public_metrics?.retweet_count || 0,
          likes: tweetData.public_metrics?.like_count || 0,
          replies: tweetData.public_metrics?.reply_count || 0,
          hashtags: this.extractHashtags(tweetData.text),
          mentions: this.extractMentions(tweetData.text),
          urls: this.extractURLs(tweetData.entities?.urls || []),
          mediaUrls: this.extractMediaURLs(media, tweetData.attachments?.media_keys || []),
          isRetweet: false,
          quotedTweetId: undefined,
          repliedToTweetId: undefined
        };

        tweets.push(tweet);
      }

      this.apiRequestCount++;
      return tweets;

    } catch (error) {
      console.error(`Failed to search tweets for "${query}":`, error);
      return tweets;
    }
  }

  /**
   * Search tweets using browser automation
   */
  private async searchTweetsBrowser(query: string): Promise<TwitterTweet[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const tweets: TwitterTweet[] = [];

    try {
      // Navigate to Twitter search
      const encodedQuery = encodeURIComponent(`${query} -filter:retweets lang:en`);
      const searchUrl = `https://twitter.com/search?q=${encodedQuery}&src=typed_query&f=live`;
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await this.delay(3000);

      // Handle login prompt if present
      await this.handleLoginPrompt();

      // Wait for tweets to load
      await this.page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 });

      // Scroll to load more tweets
      await this.scrollToLoadTweets();

      // Extract tweet elements
      const tweetElements = await this.page.$$('article[data-testid="tweet"]');
      console.log(`Found ${tweetElements.length} tweets for "${query}"`);

      // Process each tweet
      for (let i = 0; i < Math.min(tweetElements.length, this.config.maxTweetsPerSearch); i++) {
        try {
          const tweetData = await this.extractTweetDataFromElement(tweetElements[i]);
          if (tweetData) {
            tweets.push(tweetData);
          }
        } catch (error) {
          console.warn(`Failed to extract tweet ${i + 1}:`, error);
        }
      }

      return tweets;

    } catch (error) {
      console.error(`Failed to search tweets for "${query}":`, error);
      return tweets;
    }
  }

  /**
   * Initialize browser for web scraping
   */
  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: this.config.browserHeadless,
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

      // Add stealth scripts
      await this.context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
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
   * Handle Twitter login prompt
   */
  private async handleLoginPrompt(): Promise<void> {
    if (!this.page) return;

    try {
      // Check if login prompt is present
      const loginPrompt = await this.page.$('text="Log in to Twitter"');
      if (loginPrompt) {
        console.log('Login prompt detected, continuing without authentication');
        // For now, we'll continue without logging in
        // Limited functionality but should still show some tweets
      }
    } catch (error) {
      console.warn('Error handling login prompt:', error);
    }
  }

  /**
   * Scroll to load more tweets
   */
  private async scrollToLoadTweets(): Promise<void> {
    if (!this.page) return;

    try {
      let previousCount = 0;
      let currentCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 5;

      do {
        previousCount = currentCount;
        
        // Scroll down
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await this.delay(2000);

        // Count current tweets
        const tweets = await this.page.$$('article[data-testid="tweet"]');
        currentCount = tweets.length;
        
        scrollAttempts++;
        
      } while (currentCount > previousCount && scrollAttempts < maxScrollAttempts);

      console.log(`Loaded ${currentCount} tweets after ${scrollAttempts} scroll attempts`);

    } catch (error) {
      console.warn('Error scrolling to load tweets:', error);
    }
  }

  /**
   * Extract tweet data from DOM element
   */
  private async extractTweetDataFromElement(element: any): Promise<TwitterTweet | null> {
    if (!this.page) return null;

    try {
      // Use element handle to extract data
      const tweetData = await this.page.evaluate((el) => {
        // Extract text
        const textElement = el.querySelector('[data-testid="tweetText"]');
        const text = textElement ? textElement.textContent || '' : '';

        // Extract author
        const authorElement = el.querySelector('[data-testid="User-Names"] a span');
        const author = authorElement ? authorElement.textContent || 'Unknown' : 'Unknown';

        // Extract username
        const usernameElement = el.querySelector('[data-testid="User-Names"] a[href*="/"]');
        let username = 'unknown';
        if (usernameElement) {
          const href = usernameElement.getAttribute('href') || '';
          const match = href.match(/\/([^\/]+)$/);
          if (match) username = match[1];
        }

        // Extract tweet link
        const timeElement = el.querySelector('time');
        let tweetUrl = '';
        if (timeElement && timeElement.parentElement) {
          const href = timeElement.parentElement.getAttribute('href') || '';
          if (href.startsWith('/')) {
            tweetUrl = `https://twitter.com${href}`;
          }
        }

        // Extract timestamp
        let createdAt = new Date();
        if (timeElement) {
          const datetime = timeElement.getAttribute('datetime');
          if (datetime) {
            createdAt = new Date(datetime);
          }
        }

        // Extract metrics
        const metricsElements = el.querySelectorAll('[role="group"] [data-testid] span');
        let likes = 0, retweets = 0, replies = 0;
        
        metricsElements.forEach((el: Element) => {
          const text = el.textContent || '';
          const parent = el.closest('[data-testid]');
          if (!parent) return;
          
          const testId = parent.getAttribute('data-testid') || '';
          const num = parseInt(text.replace(/[^\d]/g, '')) || 0;
          
          if (testId.includes('like')) likes = num;
          else if (testId.includes('retweet')) retweets = num;
          else if (testId.includes('reply')) replies = num;
        });

        return {
          text,
          author,
          username,
          tweetUrl,
          createdAt: createdAt.toISOString(),
          likes,
          retweets,
          replies
        };
      }, element);

      if (!tweetData || !tweetData.text) {
        return null;
      }

      // Create tweet object
      const tweet: TwitterTweet = {
        id: this.extractTweetId(tweetData.tweetUrl),
        text: tweetData.text,
        author: tweetData.author,
        authorUsername: tweetData.username,
        authorUrl: `https://twitter.com/${tweetData.username}`,
        tweetUrl: tweetData.tweetUrl,
        createdAt: new Date(tweetData.createdAt),
        retweets: tweetData.retweets,
        likes: tweetData.likes,
        replies: tweetData.replies,
        hashtags: this.extractHashtags(tweetData.text),
        mentions: this.extractMentions(tweetData.text),
        urls: this.extractURLsFromText(tweetData.text),
        mediaUrls: [],
        isRetweet: tweetData.text.startsWith('RT @'),
        quotedTweetId: undefined,
        repliedToTweetId: undefined
      };

      return tweet;

    } catch (error) {
      console.warn('Failed to extract tweet data from element:', error);
      return null;
    }
  }

  /**
   * Convert Twitter tweet to opportunity
   */
  private async convertTweetToOpportunity(tweet: TwitterTweet): Promise<OpportunityData | null> {
    try {
      // Extract opportunity information from tweet text
      const title = this.extractTitle(tweet.text);
      const description = this.cleanDescription(tweet.text);
      const deadline = this.extractDeadline(tweet.text);
      const location = this.extractLocation(tweet.text);
      const amount = this.extractAmount(tweet.text);

      // Use external URL if available, otherwise tweet URL
      const opportunityUrl = tweet.urls[0] || tweet.tweetUrl;

      const opportunity: OpportunityData = {
        title: title || `Opportunity from @${tweet.authorUsername}`,
        description: description,
        url: opportunityUrl,
        organization: tweet.author,
        deadline: deadline,
        location: location,
        amount: amount,
        tags: [...tweet.hashtags, 'twitter', 'social-media'],
        sourceType: 'social',
        status: 'new',
        processed: false,
        applied: false,
        starred: false,
        sourceMetadata: {
          platform: 'twitter',
          tweetUrl: tweet.tweetUrl,
          author: tweet.author,
          authorUsername: tweet.authorUsername,
          authorUrl: tweet.authorUrl,
          tweetId: tweet.id,
          hashtags: tweet.hashtags,
          mentions: tweet.mentions,
          urls: tweet.urls,
          likes: tweet.likes,
          retweets: tweet.retweets,
          replies: tweet.replies,
          postedAt: tweet.createdAt.toISOString(),
          discoveredAt: new Date().toISOString()
        }
      };

      return opportunity;

    } catch (error) {
      console.error('Failed to convert tweet to opportunity:', error);
      return null;
    }
  }

  /**
   * Check API health
   */
  private async checkAPIHealth(): Promise<boolean> {
    try {
      const response = await fetch('https://api.twitter.com/2/tweets/search/recent?query=test&max_results=10', {
        headers: {
          'Authorization': `Bearer ${this.config.api.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.status !== 401; // Not unauthorized
    } catch (error) {
      return false;
    }
  }

  /**
   * Check browser health
   */
  private async checkBrowserHealth(): Promise<boolean> {
    try {
      if (!this.page) return false;
      
      const response = await this.page.goto('https://twitter.com', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      return response?.ok() || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check and handle API rate limiting
   */
  private async checkAPIRateLimit(): Promise<void> {
    const now = Date.now();
    const windowElapsed = now - this.windowStartTime;
    const windowMs = this.config.rateLimit.windowMinutes * 60 * 1000;

    if (windowElapsed >= windowMs) {
      // Reset window
      this.apiRequestCount = 0;
      this.windowStartTime = now;
    }

    if (this.apiRequestCount >= this.config.rateLimit.apiRequestsPerWindow) {
      const waitTime = windowMs - windowElapsed;
      console.log(`Rate limit reached, waiting ${Math.ceil(waitTime / 1000)} seconds`);
      await this.delay(waitTime);
      
      // Reset after waiting
      this.apiRequestCount = 0;
      this.windowStartTime = Date.now();
    }
  }

  /**
   * Extract tweet ID from URL
   */
  private extractTweetId(url: string): string {
    const match = url.match(/status\/(\d+)/);
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
   * Extract URLs from API entities
   */
  private extractURLs(urlEntities: any[]): string[] {
    return urlEntities.map(entity => entity.expanded_url || entity.url).filter(Boolean);
  }

  /**
   * Extract URLs from text using regex
   */
  private extractURLsFromText(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    return urls;
  }

  /**
   * Extract media URLs
   */
  private extractMediaURLs(media: any[], mediaKeys: string[]): string[] {
    const urls: string[] = [];
    for (const key of mediaKeys) {
      const mediaItem = media.find(m => m.media_key === key);
      if (mediaItem && mediaItem.url) {
        urls.push(mediaItem.url);
      }
    }
    return urls;
  }

  /**
   * Extract title from tweet text
   */
  private extractTitle(text: string): string {
    // Look for common patterns
    const patterns = [
      /(?:CALL|OPPORTUNITY|GRANT|RESIDENCY)[:\s]+([^.\n]{10,100})/i,
      /(?:announcing|presenting|introducing)[:\s]+([^.\n]{10,100})/i,
      /^([^.\n]{10,100})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: use first 100 chars
    return text.substring(0, 100).trim();
  }

  /**
   * Clean description text
   */
  private cleanDescription(text: string): string {
    // Remove excessive hashtags
    let cleaned = text.replace(/(#\w+\s*){5,}/, '');
    
    // Remove @mentions spam
    cleaned = cleaned.replace(/(@\w+\s*){3,}/, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Extract deadline from text
   */
  private extractDeadline(text: string): Date | undefined {
    const patterns = [
      /deadline[:\s]+([^.\n]+)/i,
      /due[:\s]+([^.\n]+)/i,
      /closes?[:\s]+([^.\n]+)/i,
      /submit by[:\s]+([^.\n]+)/i,
      /apply by[:\s]+([^.\n]+)/i
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
      /(?:in|at)\s+([\w\s,]+(?:city|country|state))/i
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
   * Extract amount/funding from text
   */
  private extractAmount(text: string): string {
    const patterns = [
      /\$[\d,]+(?:\.\d{2})?/,
      /€[\d,]+(?:\.\d{2})?/,
      /£[\d,]+(?:\.\d{2})?/,
      /(?:grant|funding|prize|award)[:\s]+([^.\n]*\d+[^.\n]*)/i
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

    // Filter out spam/promotional content
    const spamKeywords = ['follow me', 'dm for', 'check out', 'buy now'];
    const descLower = opportunity.description.toLowerCase();
    const spamCount = spamKeywords.filter(keyword => descLower.includes(keyword)).length;
    if (spamCount >= 2) {
      return false;
    }

    // Must contain opportunity-related keywords
    const opportunityKeywords = [
      'opportunity', 'grant', 'residency', 'call', 'competition', 
      'submit', 'apply', 'deadline', 'funding', 'fellowship', 'exhibition'
    ];
    const hasOpportunityKeywords = opportunityKeywords.some(keyword => 
      descLower.includes(keyword)
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
      rateLimit: 15, // 15 requests per minute (conservative)
      timeout: 60000, // 60 seconds
      retryAttempts: 2
    };
  }
}