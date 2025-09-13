"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentinelService = void 0;
class SentinelService {
    constructor(configManager, rateLimiter, jobScheduler, jobManager, opportunityRepository, deduplicationService, config) {
        this.configManager = configManager;
        this.rateLimiter = rateLimiter;
        this.jobScheduler = jobScheduler;
        this.jobManager = jobManager;
        this.opportunityRepository = opportunityRepository;
        this.deduplicationService = deduplicationService;
        this.config = config;
        this.plugins = new Map();
        this.isInitialized = false;
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        console.log('Initializing Sentinel Discovery Engine...');
        await this.configManager.initialize();
        await this.rateLimiter.initialize();
        await this.jobScheduler.initialize();
        await this.jobManager.initialize();
        console.log(`Sentinel initialized with ${this.plugins.size} discoverers`);
        this.isInitialized = true;
    }
    async registerDiscoverer(discoverer) {
        const config = await this.configManager.getSourceConfig(discoverer.name);
        if (!config) {
            console.warn(`No configuration found for discoverer ${discoverer.name}, using defaults`);
        }
        const plugin = {
            discoverer,
            config: config || {
                enabled: false,
                priority: 'medium',
                rateLimit: 60,
                timeout: 30000,
                retryAttempts: 3,
                metadata: {}
            },
            totalRuns: 0,
            successfulRuns: 0,
            averageProcessingTime: 0
        };
        await discoverer.initialize(plugin.config);
        this.plugins.set(discoverer.name, plugin);
        console.log(`Registered discoverer: ${discoverer.name} (${plugin.config.enabled ? 'enabled' : 'disabled'})`);
    }
    async unregisterDiscoverer(discovererName) {
        const plugin = this.plugins.get(discovererName);
        if (plugin) {
            await plugin.discoverer.cleanup();
            this.plugins.delete(discovererName);
            console.log(`Unregistered discoverer: ${discovererName}`);
        }
    }
    getDiscoverers() {
        return Array.from(this.plugins.values()).map(plugin => plugin.discoverer);
    }
    getDiscoverer(name) {
        const plugin = this.plugins.get(name);
        return plugin?.discoverer;
    }
    async checkHealth() {
        const healthStatus = {};
        for (const [name, plugin] of Array.from(this.plugins.entries())) {
            try {
                healthStatus[name] = await plugin.discoverer.isHealthy();
            }
            catch (error) {
                healthStatus[name] = false;
                console.error(`Health check failed for ${name}:`, error);
            }
        }
        return healthStatus;
    }
    async runDiscovery(context) {
        if (!this.isInitialized) {
            throw new Error('Sentinel service is not initialized');
        }
        const startTime = Date.now();
        const results = [];
        const errors = [];
        const enabledDiscoverers = this.getEnabledDiscoverersByPriority();
        console.log(`Starting discovery from ${enabledDiscoverers.length} enabled sources...`);
        const concurrentLimit = this.config.maxConcurrentJobs;
        const batches = this.createBatches(enabledDiscoverers, concurrentLimit);
        for (const batch of batches) {
            const batchPromises = batch.map(async (plugin) => {
                const jobId = await this.jobManager.createJob({
                    sourceType: plugin.discoverer.sourceType,
                    sourceName: plugin.discoverer.name,
                    status: 'pending'
                });
                try {
                    await this.jobManager.updateJobStatus(jobId, 'running');
                    const result = await this.runSingleDiscovery(plugin, context);
                    results.push(result);
                    await this.jobManager.updateJobStatus(jobId, 'completed');
                    this.updatePluginStats(plugin, true, result.processingTimeMs);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push(`Discovery failed for ${plugin.discoverer.name}: ${errorMessage}`);
                    await this.jobManager.updateJobStatus(jobId, 'failed', errorMessage);
                    this.updatePluginStats(plugin, false, 0);
                }
            });
            await Promise.all(batchPromises);
        }
        const { newOpportunities, duplicatesRemoved } = await this.processDiscoveredOpportunities(results);
        const totalOpportunities = results.reduce((sum, result) => sum + result.opportunities.length, 0);
        const consolidatedResult = {
            totalOpportunities,
            newOpportunities,
            duplicatesRemoved,
            sources: results,
            processingTimeMs: Date.now() - startTime,
            errors
        };
        console.log(`Discovery completed: ${newOpportunities} new opportunities, ${duplicatesRemoved} duplicates removed`);
        return consolidatedResult;
    }
    async runSpecificDiscovery(discovererNames, context) {
        const startTime = Date.now();
        const results = [];
        const errors = [];
        for (const name of discovererNames) {
            const plugin = this.plugins.get(name);
            if (!plugin) {
                errors.push(`Discoverer not found: ${name}`);
                continue;
            }
            if (!plugin.config.enabled) {
                errors.push(`Discoverer is disabled: ${name}`);
                continue;
            }
            try {
                const result = await this.runSingleDiscovery(plugin, context);
                results.push(result);
                this.updatePluginStats(plugin, true, result.processingTimeMs);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                errors.push(`Discovery failed for ${name}: ${errorMessage}`);
                this.updatePluginStats(plugin, false, 0);
            }
        }
        const { newOpportunities, duplicatesRemoved } = await this.processDiscoveredOpportunities(results);
        const totalOpportunities = results.reduce((sum, result) => sum + result.opportunities.length, 0);
        return {
            totalOpportunities,
            newOpportunities,
            duplicatesRemoved,
            sources: results,
            processingTimeMs: Date.now() - startTime,
            errors
        };
    }
    async toggleDiscoverer(discovererName, enabled) {
        const plugin = this.plugins.get(discovererName);
        if (!plugin) {
            throw new Error(`Discoverer not found: ${discovererName}`);
        }
        plugin.config.enabled = enabled;
        await plugin.discoverer.updateConfig(plugin.config);
        await this.configManager.updateSourceConfig(discovererName, plugin.config);
        console.log(`${enabled ? 'Enabled' : 'Disabled'} discoverer: ${discovererName}`);
    }
    getPluginStats() {
        const stats = {};
        for (const [name, plugin] of Array.from(this.plugins.entries())) {
            stats[name] = {
                enabled: plugin.config.enabled,
                priority: plugin.config.priority,
                totalRuns: plugin.totalRuns,
                successfulRuns: plugin.successfulRuns,
                successRate: plugin.totalRuns > 0 ? plugin.successfulRuns / plugin.totalRuns : 0,
                averageProcessingTime: plugin.averageProcessingTime,
                lastRun: plugin.lastRun
            };
        }
        return stats;
    }
    async getJobStatuses() {
        return await this.jobManager.getActiveJobs();
    }
    async shutdown() {
        console.log('Shutting down Sentinel Discovery Engine...');
        for (const [name, plugin] of Array.from(this.plugins.entries())) {
            try {
                await plugin.discoverer.cleanup();
            }
            catch (error) {
                console.error(`Error cleaning up discoverer ${name}:`, error);
            }
        }
        await this.jobScheduler.shutdown();
        await this.jobManager.shutdown();
        this.plugins.clear();
        this.isInitialized = false;
        console.log('Sentinel shutdown complete');
    }
    getEnabledDiscoverersByPriority() {
        const enabled = Array.from(this.plugins.values())
            .filter(plugin => plugin.config.enabled);
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return enabled.sort((a, b) => priorityOrder[b.config.priority] - priorityOrder[a.config.priority]);
    }
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
    async runSingleDiscovery(plugin, context) {
        console.log(`Running discovery: ${plugin.discoverer.name}`);
        const result = await plugin.discoverer.discover(context);
        plugin.lastRun = new Date();
        console.log(`Completed discovery: ${plugin.discoverer.name} - ${result.opportunities.length} opportunities found`);
        return result;
    }
    updatePluginStats(plugin, success, processingTime) {
        plugin.totalRuns++;
        if (success) {
            plugin.successfulRuns++;
        }
        if (plugin.totalRuns === 1) {
            plugin.averageProcessingTime = processingTime;
        }
        else {
            plugin.averageProcessingTime =
                (plugin.averageProcessingTime * (plugin.totalRuns - 1) + processingTime) / plugin.totalRuns;
        }
    }
    async processDiscoveredOpportunities(results) {
        const allOpportunities = [];
        for (const result of results) {
            allOpportunities.push(...result.opportunities);
        }
        if (allOpportunities.length === 0) {
            return { newOpportunities: 0, duplicatesRemoved: 0 };
        }
        let newOpportunities = 0;
        let duplicatesRemoved = 0;
        for (const opportunity of allOpportunities) {
            try {
                const duplicationResult = await this.deduplicationService.checkDuplicate(opportunity);
                if (!duplicationResult.isDuplicate) {
                    await this.opportunityRepository.create(opportunity);
                    newOpportunities++;
                }
                else {
                    duplicatesRemoved++;
                    console.log(`Duplicate opportunity detected: ${opportunity.title}`);
                }
            }
            catch (error) {
                console.error(`Error processing opportunity "${opportunity.title}":`, error);
            }
        }
        return { newOpportunities, duplicatesRemoved };
    }
}
exports.SentinelService = SentinelService;
//# sourceMappingURL=SentinelService.js.map