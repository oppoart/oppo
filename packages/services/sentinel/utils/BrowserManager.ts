/**
 * Browser Manager
 * Handles browser initialization, stealth configuration, and management
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BrowserInitOptions, StealthConfig, BrowserState } from '../types/linkedin.types';
import { LINKEDIN_BROWSER_CONFIG } from '../config/linkedin.config';

/**
 * Browser pool configuration
 */
export interface BrowserPoolConfig {
  maxInstances: number;
  reuseInstances: boolean;
  instanceTimeout: number;
  enablePool: boolean;
}

/**
 * Browser instance wrapper
 */
export interface BrowserInstance {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
  usageCount: number;
}

/**
 * Browser manager for handling LinkedIn scraping browsers
 */
export class BrowserManager {
  private browserPool: Map<string, BrowserInstance> = new Map();
  private poolConfig: BrowserPoolConfig;

  constructor(poolConfig: Partial<BrowserPoolConfig> = {}) {
    this.poolConfig = {
      maxInstances: 3,
      reuseInstances: true,
      instanceTimeout: 30 * 60 * 1000, // 30 minutes
      enablePool: true,
      ...poolConfig
    };
  }

  /**
   * Create a new browser instance with LinkedIn-optimized configuration
   */
  async createBrowser(options: Partial<BrowserInitOptions> = {}): Promise<BrowserInstance> {
    const config = {
      ...LINKEDIN_BROWSER_CONFIG,
      ...options
    };

    try {
      // Launch browser with stealth configuration
      const browser = await chromium.launch({
        headless: config.headless,
        args: config.args
      });

      // Create context with anti-detection measures
      const context = await browser.newContext({
        viewport: config.viewport,
        userAgent: config.userAgent,
        locale: config.locale,
        timezoneId: config.timezoneId
      });

      // Apply stealth scripts
      await this.applyStealthConfiguration(context);

      // Create page
      const page = await context.newPage();

      // Setup page event handlers
      await this.setupPageHandlers(page);

      const instance: BrowserInstance = {
        id: this.generateInstanceId(),
        browser,
        context,
        page,
        createdAt: new Date(),
        lastUsed: new Date(),
        isActive: true,
        usageCount: 0
      };

      // Add to pool if enabled
      if (this.poolConfig.enablePool) {
        await this.addToPool(instance);
      }

      console.log(`Browser instance created: ${instance.id}`);
      return instance;

    } catch (error) {
      console.error('Failed to create browser instance:', error);
      throw new Error(`Browser initialization failed: ${error}`);
    }
  }

  /**
   * Get an available browser instance from the pool or create new one
   */
  async getBrowserInstance(): Promise<BrowserInstance> {
    if (this.poolConfig.enablePool && this.poolConfig.reuseInstances) {
      const availableInstance = await this.getAvailableFromPool();
      if (availableInstance) {
        availableInstance.lastUsed = new Date();
        availableInstance.usageCount++;
        console.log(`Reusing browser instance: ${availableInstance.id}`);
        return availableInstance;
      }
    }

    return await this.createBrowser();
  }

  /**
   * Apply stealth configuration to avoid detection
   */
  private async applyStealthConfiguration(context: BrowserContext): Promise<void> {
    // Add stealth scripts to hide automation
    await context.addInitScript(() => {
      // Hide webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Spoof chrome object
      (window as any).chrome = {
        runtime: {},
        loadTimes: function() {
          return {
            commitLoadTime: Date.now() / 1000 - Math.random(),
            finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
            finishLoadTime: Date.now() / 1000 - Math.random(),
            firstPaintAfterLoadTime: 0,
            firstPaintTime: Date.now() / 1000 - Math.random(),
            navigationType: 'Other',
            npnNegotiatedProtocol: 'unknown',
            requestTime: Date.now() / 1000 - Math.random(),
            startLoadTime: Date.now() / 1000 - Math.random(),
            wasAlternateProtocolAvailable: false,
            wasFetchedViaSpdy: false,
            wasNpnNegotiated: false
          };
        },
        csi: function() {
          return {
            onloadT: Date.now(),
            pageT: Date.now(),
            startE: Date.now(),
            tran: 15
          };
        }
      };

      // Spoof plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
              enabledPlugin: Plugin
            },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          }
        ]
      });

      // Spoof languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });

      // Spoof permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
      );

      // Randomize screen properties slightly
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };
    });
  }

  /**
   * Setup page event handlers
   */
  private async setupPageHandlers(page: Page): Promise<void> {
    // Handle dialogs (dismiss them)
    page.on('dialog', async dialog => {
      console.log(`Dialog detected: ${dialog.message()}`);
      await dialog.dismiss();
    });

    // Handle console messages for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.warn(`Page console error: ${msg.text()}`);
      }
    });

    // Handle page errors
    page.on('pageerror', error => {
      console.warn(`Page error: ${error.message}`);
    });

    // Handle request failures
    page.on('requestfailed', request => {
      console.warn(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Block unnecessary resources to speed up loading
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      
      // Block images, fonts, and media to speed up scraping
      if (['image', 'font', 'media'].includes(resourceType)) {
        route.abort();
        return;
      }

      // Block analytics and tracking scripts
      const url = route.request().url();
      if (this.isTrackingUrl(url)) {
        route.abort();
        return;
      }

      route.continue();
    });
  }

  /**
   * Check if URL is a tracking/analytics URL
   */
  private isTrackingUrl(url: string): boolean {
    const trackingDomains = [
      'google-analytics.com',
      'googletagmanager.com',
      'facebook.com/tr',
      'doubleclick.net',
      'scorecardresearch.com',
      'comscore.com',
      'quantserve.com',
      'hotjar.com',
      'mixpanel.com',
      'segment.com'
    ];

    return trackingDomains.some(domain => url.includes(domain));
  }

  /**
   * Pool management methods
   */
  private async addToPool(instance: BrowserInstance): Promise<void> {
    // Remove expired instances
    await this.cleanupExpiredInstances();

    // Check pool limit
    if (this.browserPool.size >= this.poolConfig.maxInstances) {
      await this.removeOldestInstance();
    }

    this.browserPool.set(instance.id, instance);
  }

  private async getAvailableFromPool(): Promise<BrowserInstance | null> {
    for (const [id, instance] of this.browserPool) {
      if (!instance.isActive && this.isInstanceValid(instance)) {
        instance.isActive = true;
        return instance;
      }
    }
    return null;
  }

  private isInstanceValid(instance: BrowserInstance): boolean {
    const now = Date.now();
    const age = now - instance.createdAt.getTime();
    return age < this.poolConfig.instanceTimeout;
  }

  private async cleanupExpiredInstances(): Promise<void> {
    const expiredIds: string[] = [];
    
    for (const [id, instance] of this.browserPool) {
      if (!this.isInstanceValid(instance)) {
        expiredIds.push(id);
        await this.closeBrowserInstance(instance);
      }
    }

    expiredIds.forEach(id => this.browserPool.delete(id));
  }

  private async removeOldestInstance(): Promise<void> {
    let oldestInstance: BrowserInstance | null = null;
    let oldestTime = Date.now();

    for (const instance of this.browserPool.values()) {
      if (instance.lastUsed.getTime() < oldestTime && !instance.isActive) {
        oldestTime = instance.lastUsed.getTime();
        oldestInstance = instance;
      }
    }

    if (oldestInstance) {
      await this.closeBrowserInstance(oldestInstance);
      this.browserPool.delete(oldestInstance.id);
    }
  }

  /**
   * Release a browser instance back to the pool
   */
  async releaseBrowserInstance(instanceId: string): Promise<void> {
    const instance = this.browserPool.get(instanceId);
    if (instance) {
      instance.isActive = false;
      instance.lastUsed = new Date();
      console.log(`Released browser instance: ${instanceId}`);
    }
  }

  /**
   * Close a specific browser instance
   */
  async closeBrowserInstance(instance: BrowserInstance): Promise<void> {
    try {
      await instance.page.close();
      await instance.context.close();
      await instance.browser.close();
      console.log(`Closed browser instance: ${instance.id}`);
    } catch (error) {
      console.error(`Error closing browser instance ${instance.id}:`, error);
    }
  }

  /**
   * Create browser state from instance
   */
  createBrowserState(instance: BrowserInstance): BrowserState {
    return {
      browser: instance.browser,
      context: instance.context,
      page: instance.page,
      isAuthenticated: false
    };
  }

  /**
   * Close all browser instances in the pool
   */
  async closeAllInstances(): Promise<void> {
    console.log(`Closing ${this.browserPool.size} browser instances...`);
    
    const closePromises = Array.from(this.browserPool.values()).map(
      instance => this.closeBrowserInstance(instance)
    );
    
    await Promise.allSettled(closePromises);
    this.browserPool.clear();
    
    console.log('All browser instances closed');
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    const instances = Array.from(this.browserPool.values());
    
    return {
      total: instances.length,
      active: instances.filter(i => i.isActive).length,
      available: instances.filter(i => !i.isActive).length,
      averageAge: instances.reduce((sum, i) => sum + (Date.now() - i.createdAt.getTime()), 0) / instances.length,
      totalUsage: instances.reduce((sum, i) => sum + i.usageCount, 0)
    };
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(): string {
    return `browser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    await this.closeAllInstances();
  }
}