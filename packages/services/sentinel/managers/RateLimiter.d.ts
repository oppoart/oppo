import { RateLimitInfo } from '../core/interfaces';
export declare class RateLimiter {
    private buckets;
    private globalLimits;
    private isInitialized;
    initialize(): Promise<void>;
    canMakeRequest(domain: string): Promise<boolean>;
    consumeToken(domain: string): Promise<boolean>;
    waitForAvailability(domain: string): Promise<void>;
    setDomainLimit(domain: string, requestsPerMinute: number): void;
    getRateLimitInfo(domain: string): RateLimitInfo;
    getAllRateLimitInfo(): RateLimitInfo[];
    resetDomainLimit(domain: string): void;
    clearAllLimits(): void;
    getStatistics(): {
        totalDomains: number;
        activeLimits: number;
        totalRequestsBlocked: number;
    };
    shutdown(): void;
    private getBucket;
    private startCleanupInterval;
}
