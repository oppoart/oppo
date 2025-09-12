import { promises as fs } from 'fs';
import * as path from 'path';
import { DiscoverySourceConfig } from '../core/interfaces';

/**
 * Manages configuration for discovery sources
 * Supports both file-based and database-based configuration
 */
export class SourceConfigManager {
  private config: Record<string, DiscoverySourceConfig> = {};
  private configFile: string;
  private isInitialized: boolean = false;
  
  constructor(configPath?: string) {
    this.configFile = configPath || path.join(process.cwd(), 'config', 'discovery-sources.json');
  }
  
  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    try {
      await this.loadConfiguration();
      this.isInitialized = true;
      console.log(`Source configuration loaded from ${this.configFile}`);
    } catch (error) {
      console.warn(`Could not load configuration from ${this.configFile}, using defaults`);
      this.config = this.getDefaultConfiguration();
      await this.saveConfiguration(); // Create the default config file
      this.isInitialized = true;
    }
  }
  
  /**
   * Get configuration for a specific source
   */
  async getSourceConfig(sourceName: string): Promise<DiscoverySourceConfig | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.config[sourceName] || null;
  }
  
  /**
   * Get all source configurations
   */
  async getAllSourceConfigs(): Promise<Record<string, DiscoverySourceConfig>> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return { ...this.config };
  }
  
  /**
   * Update configuration for a specific source
   */
  async updateSourceConfig(sourceName: string, config: DiscoverySourceConfig): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    this.config[sourceName] = config;
    await this.saveConfiguration();
    
    console.log(`Updated configuration for source: ${sourceName}`);
  }
  
  /**
   * Add a new source configuration
   */
  async addSourceConfig(sourceName: string, config: DiscoverySourceConfig): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.config[sourceName]) {
      throw new Error(`Source configuration already exists: ${sourceName}`);
    }
    
    this.config[sourceName] = config;
    await this.saveConfiguration();
    
    console.log(`Added configuration for source: ${sourceName}`);
  }
  
  /**
   * Remove a source configuration
   */
  async removeSourceConfig(sourceName: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.config[sourceName]) {
      throw new Error(`Source configuration not found: ${sourceName}`);
    }
    
    delete this.config[sourceName];
    await this.saveConfiguration();
    
    console.log(`Removed configuration for source: ${sourceName}`);
  }
  
  /**
   * Enable/disable a source
   */
  async toggleSource(sourceName: string, enabled: boolean): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const config = this.config[sourceName];
    if (!config) {
      throw new Error(`Source configuration not found: ${sourceName}`);
    }
    
    config.enabled = enabled;
    await this.saveConfiguration();
    
    console.log(`${enabled ? 'Enabled' : 'Disabled'} source: ${sourceName}`);
  }
  
  /**
   * Get list of enabled sources
   */
  async getEnabledSources(): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return Object.keys(this.config).filter(sourceName => 
      this.config[sourceName].enabled
    );
  }
  
  /**
   * Validate configuration
   */
  validateConfiguration(config: Record<string, DiscoverySourceConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [sourceName, sourceConfig] of Object.entries(config)) {
      // Check required fields
      if (typeof sourceConfig.enabled !== 'boolean') {
        errors.push(`${sourceName}: 'enabled' must be a boolean`);
      }
      
      if (!['low', 'medium', 'high'].includes(sourceConfig.priority)) {
        errors.push(`${sourceName}: 'priority' must be 'low', 'medium', or 'high'`);
      }
      
      if (typeof sourceConfig.rateLimit !== 'number' || sourceConfig.rateLimit <= 0) {
        errors.push(`${sourceName}: 'rateLimit' must be a positive number`);
      }
      
      if (typeof sourceConfig.timeout !== 'number' || sourceConfig.timeout <= 0) {
        errors.push(`${sourceName}: 'timeout' must be a positive number`);
      }
      
      if (typeof sourceConfig.retryAttempts !== 'number' || sourceConfig.retryAttempts < 0) {
        errors.push(`${sourceName}: 'retryAttempts' must be a non-negative number`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Reload configuration from file
   */
  async reloadConfiguration(): Promise<void> {
    await this.loadConfiguration();
    console.log('Configuration reloaded');
  }
  
  /**
   * Export configuration to JSON string
   */
  async exportConfiguration(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return JSON.stringify(this.config, null, 2);
  }
  
  /**
   * Import configuration from JSON string
   */
  async importConfiguration(jsonConfig: string): Promise<void> {
    try {
      const config = JSON.parse(jsonConfig);
      const validation = this.validateConfiguration(config);
      
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      this.config = config;
      await this.saveConfiguration();
      
      console.log('Configuration imported successfully');
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }
  
  // =====================================
  // Private methods
  // =====================================
  
  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configFile, 'utf-8');
      const parsedConfig = JSON.parse(configData);
      
      const validation = this.validateConfiguration(parsedConfig);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      this.config = parsedConfig;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist - will create default config
        throw error;
      } else {
        throw new Error(`Failed to load configuration: ${error}`);
      }
    }
  }
  
  private async saveConfiguration(): Promise<void> {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configFile);
      await fs.mkdir(configDir, { recursive: true });
      
      const configJson = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configFile, configJson, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }
  
  private getDefaultConfiguration(): Record<string, DiscoverySourceConfig> {
    return {
      firecrawl: {
        enabled: true,
        priority: 'high',
        rateLimit: 60,
        timeout: 30000,
        retryAttempts: 3,
        metadata: {
          apiKey: process.env.FIRECRAWL_API_KEY || '',
          baseUrl: 'https://api.firecrawl.dev'
        }
      },
      perplexity: {
        enabled: true,
        priority: 'high',
        rateLimit: 30,
        timeout: 45000,
        retryAttempts: 3,
        metadata: {
          apiKey: process.env.PERPLEXITY_API_KEY || '',
          model: 'llama-3.1-sonar-small-128k-online'
        }
      },
      brave: {
        enabled: true,
        priority: 'medium',
        rateLimit: 50,
        timeout: 20000,
        retryAttempts: 2,
        metadata: {
          apiKey: process.env.BRAVE_SEARCH_API_KEY || '',
          count: 20
        }
      },
      artconnect: {
        enabled: true,
        priority: 'medium',
        rateLimit: 10,
        timeout: 60000,
        retryAttempts: 3,
        metadata: {
          baseUrl: 'https://www.artconnect.com',
          selectors: {
            opportunity: '.opportunity-card',
            title: '.title',
            description: '.description',
            deadline: '.deadline',
            organization: '.organization'
          }
        }
      },
      callforartists: {
        enabled: false, // Disabled by default
        priority: 'low',
        rateLimit: 5,
        timeout: 60000,
        retryAttempts: 2,
        metadata: {
          baseUrl: 'https://www.callforentry.org'
        }
      },
      openai: {
        enabled: false,
        priority: 'low',
        rateLimit: 20,
        timeout: 30000,
        retryAttempts: 2,
        metadata: {
          apiKey: process.env.OPENAI_API_KEY || '',
          model: 'gpt-4o-mini'
        }
      },
      anthropic: {
        enabled: false,
        priority: 'low',
        rateLimit: 15,
        timeout: 30000,
        retryAttempts: 2,
        metadata: {
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          model: 'claude-3-haiku-20240307'
        }
      },
      gemini: {
        enabled: false,
        priority: 'low',
        rateLimit: 25,
        timeout: 25000,
        retryAttempts: 2,
        metadata: {
          apiKey: process.env.GOOGLE_AI_API_KEY || '',
          model: 'gemini-1.5-flash'
        }
      }
    };
  }
}