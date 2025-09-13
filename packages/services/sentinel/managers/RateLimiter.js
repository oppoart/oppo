"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    constructor() {
        this.buckets = new Map();
        this.globalLimits = new Map();
        this.isInitialized = false;
    }
    async initialize() {
        this.globalLimits.set('default', 60);
        this.globalLimits.set('api.firecrawl.dev', 60);
        this.globalLimits.set('api.perplexity.ai', 30);
        this.globalLimits.set('api.search.brave.com', 50);
        this.globalLimits.set('artconnect.com', 10);
        this.globalLimits.set('callforentry.org', 5);
        this.startCleanupInterval();
        this.isInitialized = true;
        console.log('RateLimiter initialized');
    }
    async canMakeRequest(domain) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const bucket = this.getBucket(domain);
        return bucket.canConsume();
    }
    async consumeToken(domain) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const bucket = this.getBucket(domain);
        return bucket.consume();
    }
    async waitForAvailability(domain) {
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
    setDomainLimit(domain, requestsPerMinute) {
        this.globalLimits.set(domain, requestsPerMinute);
        if (this.buckets.has(domain)) {
            const bucket = this.buckets.get(domain);
            bucket.updateLimit(requestsPerMinute);
        }
        console.log(`Set rate limit for ${domain}: ${requestsPerMinute} requests/minute`);
    }
    getRateLimitInfo(domain) {
        const bucket = this.getBucket(domain);
        const limit = this.globalLimits.get(domain) || this.globalLimits.get('default');
        return {
            domain,
            requestsPerMinute: limit,
            requestsMade: bucket.getConsumedTokens(),
            resetTime: bucket.getResetTime(),
            isLimited: !bucket.canConsume()
        };
    }
    getAllRateLimitInfo() {
        const info = [];
        for (const [domain] of Array.from(this.buckets)) {
            info.push(this.getRateLimitInfo(domain));
        }
        return info;
    }
    resetDomainLimit(domain) {
        if (this.buckets.has(domain)) {
            this.buckets.delete(domain);
            console.log(`Reset rate limit for ${domain}`);
        }
    }
    clearAllLimits() {
        this.buckets.clear();
        console.log('Cleared all rate limits');
    }
    getStatistics() {
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
    shutdown() {
        this.buckets.clear();
        this.isInitialized = false;
        console.log('RateLimiter shutdown');
    }
    getBucket(domain) {
        if (!this.buckets.has(domain)) {
            const limit = this.globalLimits.get(domain) || this.globalLimits.get('default');
            const bucket = new TokenBucket(limit);
            this.buckets.set(domain, bucket);
        }
        return this.buckets.get(domain);
    }
    startCleanupInterval() {
        setInterval(() => {
            const cutoffTime = Date.now() - 10 * 60 * 1000;
            for (const [domain, bucket] of Array.from(this.buckets.entries())) {
                if (bucket.getLastAccess() < cutoffTime) {
                    this.buckets.delete(domain);
                }
            }
        }, 5 * 60 * 1000);
    }
}
exports.RateLimiter = RateLimiter;
class TokenBucket {
    constructor(requestsPerMinute, bucketSize) {
        this.requestsPerMinute = requestsPerMinute;
        this.bucketSize = bucketSize;
        this.consumedTokens = 0;
        this.blockedRequests = 0;
        this.bucketSize = bucketSize || Math.max(requestsPerMinute * 2, 10);
        this.tokens = this.bucketSize;
        this.lastRefill = Date.now();
        this.lastAccess = Date.now();
    }
    canConsume() {
        this.refillTokens();
        return this.tokens > 0;
    }
    consume() {
        this.refillTokens();
        this.lastAccess = Date.now();
        if (this.tokens > 0) {
            this.tokens--;
            this.consumedTokens++;
            return true;
        }
        else {
            this.blockedRequests++;
            return false;
        }
    }
    getWaitTime() {
        this.refillTokens();
        if (this.tokens > 0) {
            return 0;
        }
        const tokensPerMs = this.requestsPerMinute / (60 * 1000);
        const timeForOneToken = 1 / tokensPerMs;
        return Math.ceil(timeForOneToken);
    }
    updateLimit(newRequestsPerMinute) {
        this.requestsPerMinute = newRequestsPerMinute;
        this.bucketSize = Math.max(newRequestsPerMinute * 2, 10);
        if (this.tokens > this.bucketSize) {
            this.tokens = this.bucketSize;
        }
    }
    getConsumedTokens() {
        return this.consumedTokens;
    }
    getBlockedRequests() {
        return this.blockedRequests;
    }
    getResetTime() {
        const tokensNeeded = this.bucketSize - this.tokens;
        if (tokensNeeded <= 0) {
            return new Date();
        }
        const tokensPerMs = this.requestsPerMinute / (60 * 1000);
        const timeToFill = tokensNeeded / tokensPerMs;
        return new Date(Date.now() + timeToFill);
    }
    getLastAccess() {
        return this.lastAccess;
    }
    refillTokens() {
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
//# sourceMappingURL=RateLimiter.js.map