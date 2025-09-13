import { RateLimitInfo } from '../core/interfaces';
/**
 * Rate limiting implementation with domain-specific controls
 * Uses token bucket algorithm for efficient rate limiting
 */
export declare class RateLimiter {
    private buckets;
    private globalLimits;
    private isInitialized;
    /**
     * Initialize the rate limiter
     */
    initialize(): Promise<void>;
    /**
     * Check if a request is allowed for the given domain
     */
    canMakeRequest(domain: string): Promise<boolean>;
    /**
     * Consume a token for the given domain
     */
    consumeToken(domain: string): Promise<boolean>;
    /**
     * Wait until a request can be made for the given domain
     */
    waitForAvailability(domain: string): Promise<void>;
    /**
     * Set rate limit for a specific domain
     */
    setDomainLimit(domain: string, requestsPerMinute: number): void;
    /**
     * Get rate limit information for a domain
     */
    getRateLimitInfo(domain: string): RateLimitInfo;
    /**
     * Get rate limit information for all domains
     */
    getAllRateLimitInfo(): RateLimitInfo[];
    /**
     * Reset rate limit for a specific domain
     */
    resetDomainLimit(domain: string): void;
    /**
     * Clear all rate limits
     */
    clearAllLimits(): void;
    /**
     * Get statistics about rate limiting
     */
    getStatistics(): {
        totalDomains: number;
        activeLimits: number;
        totalRequestsBlocked: number;
    };
    /**
     * Shutdown the rate limiter
     */
    shutdown(): void;
    private getBucket;
    private startCleanupInterval;
}
