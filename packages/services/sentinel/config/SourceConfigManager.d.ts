import { DiscoverySourceConfig } from '../core/interfaces';
export declare class SourceConfigManager {
    private config;
    private configFile;
    private isInitialized;
    constructor(configPath?: string);
    initialize(): Promise<void>;
    getSourceConfig(sourceName: string): Promise<DiscoverySourceConfig | null>;
    getAllSourceConfigs(): Promise<Record<string, DiscoverySourceConfig>>;
    updateSourceConfig(sourceName: string, config: DiscoverySourceConfig): Promise<void>;
    addSourceConfig(sourceName: string, config: DiscoverySourceConfig): Promise<void>;
    removeSourceConfig(sourceName: string): Promise<void>;
    toggleSource(sourceName: string, enabled: boolean): Promise<void>;
    getEnabledSources(): Promise<string[]>;
    validateConfiguration(config: Record<string, DiscoverySourceConfig>): {
        valid: boolean;
        errors: string[];
    };
    reloadConfiguration(): Promise<void>;
    exportConfiguration(): Promise<string>;
    importConfiguration(jsonConfig: string): Promise<void>;
    private loadConfiguration;
    private saveConfiguration;
    private getDefaultConfiguration;
}
//# sourceMappingURL=SourceConfigManager.d.ts.map