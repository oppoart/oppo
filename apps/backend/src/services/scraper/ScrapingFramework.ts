import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import axios from 'axios';

export interface ScrapingSession {
  id: string;
  browser?: Browser;
  context?: BrowserContext;
  userAgent: string;
  proxy?: string;
  startedAt: Date;
  pageCount: number;
  successCount: number;
  failureCount: number;
}

export interface ScrapingResult {
  url: string;
  success: boolean;
  data?: any;
  error?: string;
  method: 'playwright' | 'axios' | 'failed';
  processingTime: number;
  retryCount: number;
}

export interface ScrapingOptions {
  maxRetries?: number;
  timeout?: number;
  enableJavaScript?: boolean;
  enableImages?: boolean;
  userAgent?: string;
  proxy?: string;
  waitForSelector?: string;
  scrollToBottom?: boolean;
  screenshotOnError?: boolean;
  respectRobots?: boolean;
  delay?: {
    min: number;
    max: number;
  };
}

/**
 * Advanced Web Scraping Framework
 * Handles anti-detection, rate limiting, and robust error handling
 */
export class ScrapingFramework {
  private prisma: PrismaClient;
  private activeSessions = new Map<string, ScrapingSession>();
  private userAgents: string[] = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
  ];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new scraping session with anti-detection measures
   */
  async createSession(options: ScrapingOptions = {}): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const context = await browser.newContext({
      userAgent: options.userAgent || this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });

    // Add stealth measures
    await context.addInitScript(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });

    const session: ScrapingSession = {
      id: sessionId,
      browser,
      context,
      userAgent: options.userAgent || this.getRandomUserAgent(),
      proxy: options.proxy,
      startedAt: new Date(),
      pageCount: 0,
      successCount: 0,
      failureCount: 0
    };

    this.activeSessions.set(sessionId, session);
    
    console.log(`🌐 Created scraping session: ${sessionId}`);
    return sessionId;
  }

  /**
   * Scrape single URL with retry logic and anti-detection
   */
  async scrapeUrl(
    sessionId: string,
    url: string, 
    options: ScrapingOptions = {}
  ): Promise<ScrapingResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const startTime = Date.now();
    const maxRetries = options.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🕷️  Scraping (attempt ${attempt + 1}/${maxRetries + 1}): ${url}`);

        // Apply delay between attempts
        if (attempt > 0) {
          const delay = options.delay 
            ? Math.random() * (options.delay.max - options.delay.min) + options.delay.min
            : Math.random() * 2000 + 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Try Playwright first for dynamic content
        if (options.enableJavaScript !== false) {
          try {
            const result = await this.scrapeWithPlaywright(session, url, options);
            if (result.success) {
              session.successCount++;
              return result;
            }
          } catch (error) {
            console.warn(`Playwright failed for ${url}:`, error);
            lastError = error instanceof Error ? error : new Error('Playwright failed');
          }
        }

        // Fallback to Axios for simple static content
        try {
          const result = await this.scrapeWithAxios(url, options);
          if (result.success) {
            session.successCount++;
            return result;
          }
        } catch (error) {
          console.warn(`Axios failed for ${url}:`, error);
          lastError = error instanceof Error ? error : new Error('Axios failed');
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Scraping attempt ${attempt + 1} failed for ${url}:`, lastError.message);
      }
    }

    session.failureCount++;
    
    return {
      url,
      success: false,
      error: lastError?.message || 'All scraping methods failed',
      method: 'failed',
      processingTime: Date.now() - startTime,
      retryCount: maxRetries
    };
  }

  /**
   * Scrape with Playwright (for JavaScript-heavy sites)
   */
  private async scrapeWithPlaywright(
    session: ScrapingSession,
    url: string,
    options: ScrapingOptions
  ): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    if (!session.context) {
      throw new Error('Session context not available');
    }

    const page = await session.context.newPage();
    session.pageCount++;

    try {
      // Set additional headers for stealth
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      // Navigate with realistic timeout
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: options.timeout || 15000 
      });

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 5000 });
      }

      // Scroll to bottom to trigger lazy loading
      if (options.scrollToBottom) {
        await this.scrollToBottom(page);
      }

      // Wait for content to fully load
      await page.waitForTimeout(2000);

      // Extract all relevant content
      const data = await page.evaluate(() => {
        // Remove unwanted elements
        const unwantedSelectors = [
          'script', 'style', 'nav', 'footer', 'header', 
          '.advertisement', '.ads', '.sidebar', '.cookie-banner',
          '[class*="ad"]', '[id*="ad"]', '.social-share'
        ];
        
        unwantedSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => el.remove());
        });

        // Extract structured data
        const structuredData = [];
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        jsonLdScripts.forEach(script => {
          try {
            const data = JSON.parse(script.textContent || '');
            structuredData.push(data);
          } catch (e) {
            // Ignore invalid JSON-LD
          }
        });

        return {
          title: document.title,
          html: document.documentElement.outerHTML,
          text: document.body?.innerText || '',
          url: window.location.href,
          structuredData,
          meta: {
            description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
            keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content'),
            author: document.querySelector('meta[name="author"]')?.getAttribute('content'),
            publishDate: document.querySelector('meta[property="article:published_time"]')?.getAttribute('content'),
            modifiedDate: document.querySelector('meta[property="article:modified_time"]')?.getAttribute('content')
          },
          links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
            text: a.textContent?.trim(),
            href: a.getAttribute('href'),
            title: a.getAttribute('title')
          })).filter(link => link.href && link.text),
          images: Array.from(document.querySelectorAll('img[src]')).map(img => ({
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title')
          }))
        };
      });

      return {
        url,
        success: true,
        data,
        method: 'playwright',
        processingTime: Date.now() - startTime,
        retryCount: 0
      };

    } catch (error) {
      // Take screenshot on error if requested
      if (options.screenshotOnError) {
        try {
          await page.screenshot({ path: `error-${Date.now()}.png` });
        } catch (screenshotError) {
          console.warn('Failed to take error screenshot:', screenshotError);
        }
      }

      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape with Axios (for static content)
   */
  private async scrapeWithAxios(url: string, options: ScrapingOptions): Promise<ScrapingResult> {
    const startTime = Date.now();

    const config = {
      method: 'GET',
      url,
      timeout: options.timeout || 10000,
      headers: {
        'User-Agent': options.userAgent || this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      maxRedirects: 3,
      ...(options.proxy && { 
        proxy: {
          protocol: 'http',
          host: options.proxy.split(':')[0],
          port: parseInt(options.proxy.split(':')[1])
        }
      })
    };

    try {
      const response = await axios(config);
      const html = response.data;
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script, style, nav, footer, header, .advertisement, .ads').remove();

      // Extract structured data
      const structuredData = [];
      $('script[type="application/ld+json"]').each((_, script) => {
        try {
          const data = JSON.parse($(script).html() || '');
          structuredData.push(data);
        } catch (e) {
          // Ignore invalid JSON-LD
        }
      });

      const data = {
        title: $('title').text() || '',
        html: $.html(),
        text: $('body').text() || '',
        url: response.request.responseURL || url,
        structuredData,
        meta: {
          description: $('meta[name="description"]').attr('content'),
          keywords: $('meta[name="keywords"]').attr('content'),
          author: $('meta[name="author"]').attr('content'),
          publishDate: $('meta[property="article:published_time"]').attr('content'),
          modifiedDate: $('meta[property="article:modified_time"]').attr('content')
        },
        links: $('a[href]').map((_, a) => ({
          text: $(a).text().trim(),
          href: $(a).attr('href'),
          title: $(a).attr('title')
        })).get().filter(link => link.href && link.text),
        images: $('img[src]').map((_, img) => ({
          src: $(img).attr('src'),
          alt: $(img).attr('alt'),
          title: $(img).attr('title')
        })).get()
      };

      return {
        url,
        success: true,
        data,
        method: 'axios',
        processingTime: Date.now() - startTime,
        retryCount: 0
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Batch scraping with rate limiting
   */
  async scrapeBatch(
    sessionId: string,
    urls: string[],
    options: ScrapingOptions & { 
      concurrency?: number;
      rateLimitMs?: number;
    } = {}
  ): Promise<ScrapingResult[]> {
    const { concurrency = 3, rateLimitMs = 1000, ...scrapeOptions } = options;
    const results: ScrapingResult[] = [];
    
    console.log(`📦 Starting batch scraping: ${urls.length} URLs with concurrency ${concurrency}`);

    // Process in chunks
    const chunks = this.chunkArray(urls, concurrency);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(url => 
        this.scrapeUrl(sessionId, url, scrapeOptions)
      );

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Rate limiting between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1 && rateLimitMs > 0) {
        console.log(`⏳ Rate limiting: waiting ${rateLimitMs}ms`);
        await new Promise(resolve => setTimeout(resolve, rateLimitMs));
      }
    }

    return results;
  }

  /**
   * Scroll to bottom of page to trigger lazy loading
   */
  private async scrollToBottom(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve(null);
          }
        }, 100);
      });
    });
  }

  /**
   * Get random user agent
   */
  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Chunk array utility
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Close scraping session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      if (session.context) {
        await session.context.close();
      }
      if (session.browser) {
        await session.browser.close();
      }
      this.activeSessions.delete(sessionId);
      
      console.log(`🔒 Closed scraping session: ${sessionId} (${session.successCount} successes, ${session.failureCount} failures)`);
    }
  }

  /**
   * Get session stats
   */
  getSessionStats(sessionId: string): ScrapingSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ScrapingSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Cleanup all sessions
   */
  async cleanup(): Promise<void> {
    const sessionIds = Array.from(this.activeSessions.keys());
    await Promise.all(sessionIds.map(id => this.closeSession(id)));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const sessionId = await this.createSession({ timeout: 5000 });
      const result = await this.scrapeUrl(sessionId, 'https://httpbin.org/user-agent', { timeout: 5000 });
      await this.closeSession(sessionId);
      return result.success;
    } catch {
      return false;
    }
  }
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  console.log('🛑 Cleaning up scraping sessions...');
  // Global cleanup would happen here in a real implementation
});

process.on('SIGTERM', async () => {
  console.log('🛑 Cleaning up scraping sessions...');
  // Global cleanup would happen here in a real implementation
});

export const scrapingFramework = new ScrapingFramework(new PrismaClient());