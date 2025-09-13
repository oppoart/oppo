"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceConfigManager = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
/**
 * Manages configuration for discovery sources
 * Supports both file-based and database-based configuration
 */
class SourceConfigManager {
    constructor(configPath) {
        this.config = {};
        this.isInitialized = false;
        this.configFile = configPath || path.join(process.cwd(), 'config', 'discovery-sources.json');
    }
    /**
     * Initialize the configuration manager
     */
    async initialize() {
        try {
            await this.loadConfiguration();
            this.isInitialized = true;
            console.log(`Source configuration loaded from ${this.configFile}`);
        }
        catch (error) {
            console.warn(`Could not load configuration from ${this.configFile}, using defaults`);
            this.config = this.getDefaultConfiguration();
            await this.saveConfiguration(); // Create the default config file
            this.isInitialized = true;
        }
    }
    /**
     * Get configuration for a specific source
     */
    async getSourceConfig(sourceName) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.config[sourceName] || null;
    }
    /**
     * Get all source configurations
     */
    async getAllSourceConfigs() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return { ...this.config };
    }
    /**
     * Update configuration for a specific source
     */
    async updateSourceConfig(sourceName, config) {
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
    async addSourceConfig(sourceName, config) {
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
    async removeSourceConfig(sourceName) {
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
    async toggleSource(sourceName, enabled) {
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
    async getEnabledSources() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return Object.keys(this.config).filter(sourceName => this.config[sourceName].enabled);
    }
    /**
     * Validate configuration
     */
    validateConfiguration(config) {
        const errors = [];
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
    async reloadConfiguration() {
        await this.loadConfiguration();
        console.log('Configuration reloaded');
    }
    /**
     * Export configuration to JSON string
     */
    async exportConfiguration() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return JSON.stringify(this.config, null, 2);
    }
    /**
     * Import configuration from JSON string
     */
    async importConfiguration(jsonConfig) {
        try {
            const config = JSON.parse(jsonConfig);
            const validation = this.validateConfiguration(config);
            if (!validation.valid) {
                throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
            }
            this.config = config;
            await this.saveConfiguration();
            console.log('Configuration imported successfully');
        }
        catch (error) {
            throw new Error(`Failed to import configuration: ${error}`);
        }
    }
    // =====================================
    // Private methods
    // =====================================
    async loadConfiguration() {
        try {
            const configData = await fs_1.promises.readFile(this.configFile, 'utf-8');
            const parsedConfig = JSON.parse(configData);
            const validation = this.validateConfiguration(parsedConfig);
            if (!validation.valid) {
                throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
            }
            this.config = parsedConfig;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist - will create default config
                throw error;
            }
            else {
                throw new Error(`Failed to load configuration: ${error}`);
            }
        }
    }
    async saveConfiguration() {
        try {
            // Ensure config directory exists
            const configDir = path.dirname(this.configFile);
            await fs_1.promises.mkdir(configDir, { recursive: true });
            const configJson = JSON.stringify(this.config, null, 2);
            await fs_1.promises.writeFile(this.configFile, configJson, 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to save configuration: ${error}`);
        }
    }
    getDefaultConfiguration() {
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
exports.SourceConfigManager = SourceConfigManager;
