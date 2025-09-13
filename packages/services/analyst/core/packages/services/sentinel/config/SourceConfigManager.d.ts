import { DiscoverySourceConfig } from '../core/interfaces';
/**
 * Manages configuration for discovery sources
 * Supports both file-based and database-based configuration
 */
export declare class SourceConfigManager {
    private config;
    private configFile;
    private isInitialized;
    constructor(configPath?: string);
    /**
     * Initialize the configuration manager
     */
    initialize(): Promise<void>;
    /**
     * Get configuration for a specific source
     */
    getSourceConfig(sourceName: string): Promise<DiscoverySourceConfig | null>;
    /**
     * Get all source configurations
     */
    getAllSourceConfigs(): Promise<Record<string, DiscoverySourceConfig>>;
    /**
     * Update configuration for a specific source
     */
    updateSourceConfig(sourceName: string, config: DiscoverySourceConfig): Promise<void>;
    /**
     * Add a new source configuration
     */
    addSourceConfig(sourceName: string, config: DiscoverySourceConfig): Promise<void>;
    /**
     * Remove a source configuration
     */
    removeSourceConfig(sourceName: string): Promise<void>;
    /**
     * Enable/disable a source
     */
    toggleSource(sourceName: string, enabled: boolean): Promise<void>;
    /**
     * Get list of enabled sources
     */
    getEnabledSources(): Promise<string[]>;
    /**
     * Validate configuration
     */
    validateConfiguration(config: Record<string, DiscoverySourceConfig>): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Reload configuration from file
     */
    reloadConfiguration(): Promise<void>;
    /**
     * Export configuration to JSON string
     */
    exportConfiguration(): Promise<string>;
    /**
     * Import configuration from JSON string
     */
    importConfiguration(jsonConfig: string): Promise<void>;
    private loadConfiguration;
    private saveConfiguration;
    private getDefaultConfiguration;
}
