import { z } from 'zod';
import { OrchestratorConfig } from '../types';

// Configuration Schema
const OrchestratorConfigSchema = z.object({
  scheduling: z.object({
    scanInterval: z.string().default('24h'),
    alertCheckInterval: z.string().default('1h'),
    cleanupInterval: z.string().default('7d'),
    maxConcurrentScans: z.number().min(1).max(10).default(3),
    timezone: z.string().default('UTC')
  }),
  agent: z.object({
    model: z.string().default('gpt-3.5-turbo'),
    maxToolCalls: z.number().min(1).max(20).default(5),
    timeout: z.number().min(5000).max(300000).default(30000),
    temperature: z.number().min(0).max(2).default(0.7),
    vectorStorePath: z.string().default('./data/vectors'),
    maxContextLength: z.number().default(4000),
    embeddingModel: z.string().default('text-embedding-ada-002')
  }),
  events: z.object({
    maxRetries: z.number().min(0).max(10).default(3),
    retryDelay: z.number().min(1000).max(60000).default(5000),
    deadLetterQueueSize: z.number().min(10).max(1000).default(100),
    eventTimeout: z.number().min(5000).max(300000).default(60000)
  }),
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().min(60000).max(3600000).default(300000), // 5 minutes
    maxSize: z.number().min(100).max(10000).default(1000),
    redisUrl: z.string().optional()
  }),
  database: z.object({
    url: z.string(),
    maxConnections: z.number().min(5).max(100).default(20),
    queryTimeout: z.number().min(5000).max(60000).default(30000)
  }),
  external: z.object({
    googleApiKey: z.string().optional(),
    googleCseId: z.string().optional(),
    bingApiKey: z.string().optional(),
    serpApiKey: z.string().optional(),
    openaiApiKey: z.string().optional(),
    rateLimits: z.object({
      googleSearchPerDay: z.number().default(1000),
      bingSearchPerMonth: z.number().default(3000),
      serpSearchPerMonth: z.number().default(1000),
      openaiRequestsPerMinute: z.number().default(60)
    }).default({})
  }),
  security: z.object({
    enableAuth: z.boolean().default(true),
    jwtSecret: z.string().optional(),
    encryptionKey: z.string().optional(),
    allowedOrigins: z.array(z.string()).default(['http://localhost:3000']),
    rateLimit: z.object({
      windowMs: z.number().default(900000), // 15 minutes
      maxRequests: z.number().default(100)
    }).default({})
  })
});

export class ConfigManager {
  private config: OrchestratorConfig;
  private isLoaded: boolean = false;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  // Configuration Loading
  async loadConfig(configPath?: string): Promise<OrchestratorConfig> {
    if (this.isLoaded && !configPath) {
      return this.config;
    }

    try {
      let rawConfig: any = {};

      // Load from file if path provided
      if (configPath) {
        const fs = await import('fs/promises');
        const configFile = await fs.readFile(configPath, 'utf-8');
        rawConfig = JSON.parse(configFile);
      }

      // Merge with environment variables
      const envConfig = this.loadFromEnvironment();
      const mergedConfig = this.deepMerge(rawConfig, envConfig);

      // Validate configuration
      const validatedConfig = OrchestratorConfigSchema.parse(mergedConfig);
      
      this.config = validatedConfig as OrchestratorConfig;
      this.isLoaded = true;

      console.log('Orchestrator configuration loaded successfully');
      return this.config;
    } catch (error) {
      console.error('Failed to load orchestrator configuration:', error);
      
      // Fall back to default config
      console.warn('Using default configuration');
      this.config = this.getDefaultConfig();
      this.isLoaded = true;
      
      return this.config;
    }
  }

  // Environment Variable Loading
  private loadFromEnvironment(): Partial<OrchestratorConfig> {
    const env = process.env;

    return {
      scheduling: {
        scanInterval: env.ORCHESTRATOR_SCAN_INTERVAL || '24h',
        alertCheckInterval: env.ORCHESTRATOR_ALERT_INTERVAL || '1h',
        cleanupInterval: env.ORCHESTRATOR_CLEANUP_INTERVAL || '7d',
        maxConcurrentScans: parseInt(env.ORCHESTRATOR_MAX_CONCURRENT_SCANS || '3'),
        timezone: env.ORCHESTRATOR_TIMEZONE || 'UTC'
      },
      agent: {
        model: env.ORCHESTRATOR_AGENT_MODEL || 'gpt-3.5-turbo',
        maxToolCalls: parseInt(env.ORCHESTRATOR_MAX_TOOL_CALLS || '5'),
        timeout: parseInt(env.ORCHESTRATOR_AGENT_TIMEOUT || '30000'),
        temperature: parseFloat(env.ORCHESTRATOR_AGENT_TEMPERATURE || '0.7'),
        vectorStorePath: env.ORCHESTRATOR_VECTOR_STORE_PATH || './data/vectors',
        maxContextLength: parseInt(env.ORCHESTRATOR_MAX_CONTEXT_LENGTH || '4000'),
        embeddingModel: env.ORCHESTRATOR_EMBEDDING_MODEL || 'text-embedding-ada-002'
      },
      events: {
        maxRetries: parseInt(env.ORCHESTRATOR_MAX_RETRIES || '3'),
        retryDelay: parseInt(env.ORCHESTRATOR_RETRY_DELAY || '5000'),
        deadLetterQueueSize: parseInt(env.ORCHESTRATOR_DLQ_SIZE || '100'),
        eventTimeout: parseInt(env.ORCHESTRATOR_EVENT_TIMEOUT || '60000')
      },
      cache: {
        enabled: env.ORCHESTRATOR_CACHE_ENABLED === 'true',
        ttl: parseInt(env.ORCHESTRATOR_CACHE_TTL || '300000'),
        maxSize: parseInt(env.ORCHESTRATOR_CACHE_MAX_SIZE || '1000'),
        redisUrl: env.REDIS_URL
      },
      database: {
        url: env.DATABASE_URL || '',
        maxConnections: parseInt(env.ORCHESTRATOR_DB_MAX_CONNECTIONS || '20'),
        queryTimeout: parseInt(env.ORCHESTRATOR_DB_QUERY_TIMEOUT || '30000')
      },
      external: {
        googleApiKey: env.GOOGLE_API_KEY,
        googleCseId: env.GOOGLE_CSE_ID,
        bingApiKey: env.BING_API_KEY,
        serpApiKey: env.SERP_API_KEY,
        openaiApiKey: env.OPENAI_API_KEY,
        rateLimits: {
          googleSearchPerDay: parseInt(env.GOOGLE_SEARCH_LIMIT_PER_DAY || '1000'),
          bingSearchPerMonth: parseInt(env.BING_SEARCH_LIMIT_PER_MONTH || '3000'),
          serpSearchPerMonth: parseInt(env.SERP_SEARCH_LIMIT_PER_MONTH || '1000'),
          openaiRequestsPerMinute: parseInt(env.OPENAI_REQUESTS_PER_MINUTE || '60')
        }
      },
      security: {
        enableAuth: env.ORCHESTRATOR_ENABLE_AUTH !== 'false',
        jwtSecret: env.JWT_SECRET,
        encryptionKey: env.ENCRYPTION_KEY,
        allowedOrigins: env.ORCHESTRATOR_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        rateLimit: {
          windowMs: parseInt(env.ORCHESTRATOR_RATE_LIMIT_WINDOW_MS || '900000'),
          maxRequests: parseInt(env.ORCHESTRATOR_RATE_LIMIT_MAX_REQUESTS || '100')
        }
      }
    };
  }

  // Configuration Access
  getConfig(): OrchestratorConfig {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  getSchedulingConfig() {
    return this.getConfig().scheduling;
  }

  getAgentConfig() {
    return this.getConfig().agent;
  }

  getEventsConfig() {
    return this.getConfig().events;
  }

  getCacheConfig() {
    return this.getConfig().cache;
  }

  getDatabaseConfig() {
    return this.getConfig().database;
  }

  getExternalConfig() {
    return this.getConfig().external;
  }

  getSecurityConfig() {
    return this.getConfig().security;
  }

  // Configuration Updates
  async updateConfig(updates: Partial<OrchestratorConfig>): Promise<void> {
    const updatedConfig = this.deepMerge(this.config, updates);
    
    try {
      const validatedConfig = OrchestratorConfigSchema.parse(updatedConfig);
      this.config = validatedConfig as OrchestratorConfig;
      console.log('Configuration updated successfully');
    } catch (error) {
      console.error('Failed to validate updated configuration:', error);
      throw new Error('Invalid configuration update');
    }
  }

  // Configuration Validation
  validateConfig(config: any): { valid: boolean; errors: string[] } {
    try {
      OrchestratorConfigSchema.parse(config);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
      return { valid: false, errors: [String(error)] };
    }
  }

  // Configuration Persistence
  async saveConfig(configPath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const configJson = JSON.stringify(this.config, null, 2);
      await fs.writeFile(configPath, configJson, 'utf-8');
      console.log(`Configuration saved to ${configPath}`);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  // Helper Methods
  private getDefaultConfig(): OrchestratorConfig {
    return OrchestratorConfigSchema.parse({}) as OrchestratorConfig;
  }

  private deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) {
      return target;
    }

    if (typeof target !== 'object' || typeof source !== 'object') {
      return source;
    }

    const result = { ...target };

    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // Configuration Health Check
  async healthCheck(): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    if (!process.env.DATABASE_URL) {
      issues.push('DATABASE_URL environment variable is required');
    }

    // Check API keys
    const apiKeys = this.getExternalConfig();
    if (!apiKeys.googleApiKey && !apiKeys.bingApiKey && !apiKeys.serpApiKey) {
      warnings.push('No search API keys configured - search functionality will use mock data');
    }

    if (!apiKeys.openaiApiKey) {
      warnings.push('OpenAI API key not configured - RAG agent will use mock responses');
    }

    // Check cache configuration
    const cacheConfig = this.getCacheConfig();
    if (cacheConfig.enabled && !cacheConfig.redisUrl) {
      warnings.push('Cache is enabled but Redis URL not provided - using in-memory cache');
    }

    // Check security configuration
    const securityConfig = this.getSecurityConfig();
    if (securityConfig.enableAuth && !securityConfig.jwtSecret) {
      issues.push('Authentication is enabled but JWT secret is not configured');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings
    };
  }

  // Development Helpers
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  enableDebugMode(): void {
    if (this.isDevelopment()) {
      console.log('Debug mode enabled for orchestrator');
      // Additional debug logging setup could go here
    }
  }

  // Configuration Export
  exportConfig(): any {
    return {
      ...this.config,
      // Redact sensitive information
      external: {
        ...this.config.external,
        googleApiKey: this.redactKey(this.config.external.googleApiKey),
        bingApiKey: this.redactKey(this.config.external.bingApiKey),
        serpApiKey: this.redactKey(this.config.external.serpApiKey),
        openaiApiKey: this.redactKey(this.config.external.openaiApiKey)
      },
      security: {
        ...this.config.security,
        jwtSecret: this.redactKey(this.config.security.jwtSecret),
        encryptionKey: this.redactKey(this.config.security.encryptionKey)
      }
    };
  }

  private redactKey(key?: string): string {
    if (!key) return '[not set]';
    if (key.length <= 8) return '[redacted]';
    return key.substring(0, 4) + '***' + key.substring(key.length - 4);
  }
}