import { RateLimitInfo } from '../core/interfaces';

/**
 * Rate limiting implementation with domain-specific controls
 * Uses token bucket algorithm for efficient rate limiting
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private globalLimits: Map<string, number> = new Map();
  private isInitialized: boolean = false;
  
  /**
   * Initialize the rate limiter
   */
  async initialize(): Promise<void> {
    // Set up default global limits
    this.globalLimits.set('default', 60); // 60 requests per minute
    this.globalLimits.set('api.firecrawl.dev', 60);
    this.globalLimits.set('api.perplexity.ai', 30);
    this.globalLimits.set('api.search.brave.com', 50);
    this.globalLimits.set('artconnect.com', 10);
    this.globalLimits.set('callforentry.org', 5);
    
    // Start cleanup interval
    this.startCleanupInterval();
    
    this.isInitialized = true;
    console.log('RateLimiter initialized');
  }
  
  /**
   * Check if a request is allowed for the given domain
   */
  async canMakeRequest(domain: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const bucket = this.getBucket(domain);
    return bucket.canConsume();
  }
  
  /**
   * Consume a token for the given domain
   */
  async consumeToken(domain: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const bucket = this.getBucket(domain);
    return bucket.consume();
  }
  
  /**
   * Wait until a request can be made for the given domain
   */
  async waitForAvailability(domain: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const bucket = this.getBucket(domain);
    const waitTime = bucket.getWaitTime();
    
    if (waitTime > 0) {
      console.log(`Rate limited for ${domain}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  /**
   * Set rate limit for a specific domain
   */
  setDomainLimit(domain: string, requestsPerMinute: number): void {
    this.globalLimits.set(domain, requestsPerMinute);
    
    // Update existing bucket if it exists
    if (this.buckets.has(domain)) {
      const bucket = this.buckets.get(domain)!;
      bucket.updateLimit(requestsPerMinute);
    }
    
    console.log(`Set rate limit for ${domain}: ${requestsPerMinute} requests/minute`);
  }
  
  /**
   * Get rate limit information for a domain
   */
  getRateLimitInfo(domain: string): RateLimitInfo {
    const bucket = this.getBucket(domain);
    const limit = this.globalLimits.get(domain) || this.globalLimits.get('default')!;
    
    return {
      domain,
      requestsPerMinute: limit,
      requestsMade: bucket.getConsumedTokens(),
      resetTime: bucket.getResetTime(),
      isLimited: !bucket.canConsume()
    };
  }
  
  /**
   * Get rate limit information for all domains
   */
  getAllRateLimitInfo(): RateLimitInfo[] {
    const info: RateLimitInfo[] = [];
    
    for (const [domain] of Array.from(this.buckets)) {
      info.push(this.getRateLimitInfo(domain));
    }
    
    return info;
  }
  
  /**
   * Reset rate limit for a specific domain
   */
  resetDomainLimit(domain: string): void {
    if (this.buckets.has(domain)) {
      this.buckets.delete(domain);
      console.log(`Reset rate limit for ${domain}`);
    }
  }
  
  /**
   * Clear all rate limits
   */
  clearAllLimits(): void {
    this.buckets.clear();
    console.log('Cleared all rate limits');
  }
  
  /**
   * Get statistics about rate limiting
   */
  getStatistics(): {
    totalDomains: number;
    activeLimits: number;
    totalRequestsBlocked: number;
  } {
    let totalRequestsBlocked = 0;
    let activeLimits = 0;
    
    for (const [, bucket] of Array.from(this.buckets)) {
      totalRequestsBlocked += bucket.getBlockedRequests();
      if (!bucket.canConsume()) {
        activeLimits++;
      }
    }
    
    return {
      totalDomains: this.buckets.size,
      activeLimits,
      totalRequestsBlocked
    };
  }
  
  /**
   * Shutdown the rate limiter
   */
  shutdown(): void {
    this.buckets.clear();
    this.isInitialized = false;
    console.log('RateLimiter shutdown');
  }
  
  // =====================================
  // Private methods
  // =====================================
  
  private getBucket(domain: string): TokenBucket {
    if (!this.buckets.has(domain)) {
      const limit = this.globalLimits.get(domain) || this.globalLimits.get('default')!;
      const bucket = new TokenBucket(limit);
      this.buckets.set(domain, bucket);
    }
    
    return this.buckets.get(domain)!;
  }
  
  private startCleanupInterval(): void {
    // Clean up old buckets every 5 minutes
    setInterval(() => {
      const cutoffTime = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      
      for (const [domain, bucket] of Array.from(this.buckets.entries())) {
        if (bucket.getLastAccess() < cutoffTime) {
          this.buckets.delete(domain);
        }
      }
    }, 5 * 60 * 1000);
  }
}

/**
 * Token bucket implementation for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private consumedTokens: number = 0;
  private blockedRequests: number = 0;
  private lastAccess: number;
  
  constructor(
    private requestsPerMinute: number,
    private bucketSize?: number
  ) {
    // Allow burst of up to 2x the per-minute rate
    this.bucketSize = bucketSize || Math.max(requestsPerMinute * 2, 10);
    this.tokens = this.bucketSize;
    this.lastRefill = Date.now();
    this.lastAccess = Date.now();
  }
  
  /**
   * Check if a token can be consumed without actually consuming it
   */
  canConsume(): boolean {
    this.refillTokens();
    return this.tokens > 0;
  }
  
  /**
   * Consume a token if available
   */
  consume(): boolean {
    this.refillTokens();
    this.lastAccess = Date.now();
    
    if (this.tokens > 0) {
      this.tokens--;
      this.consumedTokens++;
      return true;
    } else {
      this.blockedRequests++;
      return false;
    }
  }
  
  /**
   * Get the time to wait before the next token is available
   */
  getWaitTime(): number {
    this.refillTokens();
    
    if (this.tokens > 0) {
      return 0;
    }
    
    // Calculate time until next token refill
    const tokensPerMs = this.requestsPerMinute / (60 * 1000);
    const timeForOneToken = 1 / tokensPerMs;
    
    return Math.ceil(timeForOneToken);
  }
  
  /**
   * Update the rate limit
   */
  updateLimit(newRequestsPerMinute: number): void {
    this.requestsPerMinute = newRequestsPerMinute;
    this.bucketSize = Math.max(newRequestsPerMinute * 2, 10);
    
    // Don't exceed new bucket size
    if (this.tokens > this.bucketSize) {
      this.tokens = this.bucketSize;
    }
  }
  
  /**
   * Get the number of consumed tokens
   */
  getConsumedTokens(): number {
    return this.consumedTokens;
  }
  
  /**
   * Get the number of blocked requests
   */
  getBlockedRequests(): number {
    return this.blockedRequests;
  }
  
  /**
   * Get the time when the bucket will be full again
   */
  getResetTime(): Date {
    const tokensNeeded = this.bucketSize - this.tokens;
    if (tokensNeeded <= 0) {
      return new Date();
    }
    
    const tokensPerMs = this.requestsPerMinute / (60 * 1000);
    const timeToFill = tokensNeeded / tokensPerMs;
    
    return new Date(Date.now() + timeToFill);
  }
  
  /**
   * Get the last access time
   */
  getLastAccess(): number {
    return this.lastAccess;
  }
  
  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    
    if (timePassed > 0) {
      const tokensPerMs = this.requestsPerMinute / (60 * 1000);
      const tokensToAdd = Math.floor(timePassed * tokensPerMs);
      
      if (tokensToAdd > 0) {
        this.tokens = Math.min(this.bucketSize, this.tokens + tokensToAdd);
        this.lastRefill = now;
      }
    }
  }
}