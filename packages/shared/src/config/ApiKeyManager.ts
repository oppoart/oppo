/**
 * Centralized API Key Manager
 * Handles validation, fallback strategies, and monitoring for all external API keys
 */

export interface ApiKeyConfig {
  key: string;
  required: boolean;
  validator?: (key: string) => boolean;
  healthCheckUrl?: string;
  fallback?: string[];
}

export interface ApiServiceStatus {
  name: string;
  configured: boolean;
  valid: boolean;
  error?: string;
  lastChecked?: Date;
}

export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private keyConfigs: Map<string, ApiKeyConfig> = new Map();
  private serviceStatus: Map<string, ApiServiceStatus> = new Map();

  private constructor() {
    this.initializeKeyConfigs();
  }

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  private initializeKeyConfigs(): void {
    // Search APIs
    this.keyConfigs.set('GOOGLE_SEARCH_API_KEY', {
      key: process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || process.env.GOOGLE_API_KEY || '',
      required: false,
      validator: (key: string) => key.length > 20 && key.startsWith('AIza'),
      healthCheckUrl: 'https://www.googleapis.com/customsearch/v1',
      fallback: ['SERPAPI_KEY', 'BING_SEARCH_API_KEY']
    });

    this.keyConfigs.set('GOOGLE_SEARCH_ENGINE_ID', {
      key: process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CSE_ID || '',
      required: false,
      validator: (key: string) => key.length > 10
    });

    this.keyConfigs.set('SERPAPI_KEY', {
      key: process.env.SERPAPI_KEY || process.env.SERP_API_KEY || '',
      required: false,
      validator: (key: string) => key.length > 30,
      healthCheckUrl: 'https://serpapi.com/search',
      fallback: ['GOOGLE_SEARCH_API_KEY', 'BING_SEARCH_API_KEY']
    });

    this.keyConfigs.set('BING_SEARCH_API_KEY', {
      key: process.env.BING_SEARCH_API_KEY || process.env.BING_API_KEY || '',
      required: false,
      validator: (key: string) => key.length === 32
    });

    // AI APIs
    this.keyConfigs.set('OPENAI_API_KEY', {
      key: process.env.OPENAI_API_KEY || '',
      required: true,
      validator: (key: string) => key.startsWith('sk-') && key.length > 40,
      healthCheckUrl: 'https://api.openai.com/v1/models',
      fallback: ['ANTHROPIC_API_KEY', 'GOOGLE_AI_API_KEY']
    });

    this.keyConfigs.set('ANTHROPIC_API_KEY', {
      key: process.env.ANTHROPIC_API_KEY || '',
      required: false,
      validator: (key: string) => key.startsWith('sk-ant-') && key.length > 40,
      healthCheckUrl: 'https://api.anthropic.com/v1/messages'
    });

    this.keyConfigs.set('GOOGLE_AI_API_KEY', {
      key: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '',
      required: false,
      validator: (key: string) => key.startsWith('AIza') && key.length > 30
    });

    // Web Scraping APIs
    this.keyConfigs.set('FIRECRAWL_API_KEY', {
      key: process.env.FIRECRAWL_API_KEY || '',
      required: false,
      validator: (key: string) => key.startsWith('fc-') && key.length > 20
    });

    this.keyConfigs.set('PERPLEXITY_API_KEY', {
      key: process.env.PERPLEXITY_API_KEY || '',
      required: false,
      validator: (key: string) => key.startsWith('pplx-') && key.length > 30
    });

    this.keyConfigs.set('BRAVE_SEARCH_API_KEY', {
      key: process.env.BRAVE_SEARCH_API_KEY || '',
      required: false,
      validator: (key: string) => key.length > 20
    });
  }

  /**
   * Get API key with fallback support
   */
  public getApiKey(service: string): string | null {
    const config = this.keyConfigs.get(service);
    if (!config) {
      console.warn(`Unknown API service: ${service}`);
      return null;
    }

    // Return primary key if available and valid
    if (config.key && this.validateApiKey(service, config.key)) {
      return config.key;
    }

    // Try fallback services
    if (config.fallback) {
      for (const fallbackService of config.fallback) {
        const fallbackKey = this.getApiKey(fallbackService);
        if (fallbackKey) {
          console.log(`Using fallback service ${fallbackService} for ${service}`);
          return fallbackKey;
        }
      }
    }

    return null;
  }

  /**
   * Validate API key format
   */
  public validateApiKey(service: string, key: string): boolean {
    const config = this.keyConfigs.get(service);
    if (!config) return false;

    if (!key || key.trim() === '') return false;

    // Check for placeholder values
    const placeholders = ['your_api_key_here', 'your_key_here', 'sk-...', 'AIza...'];
    if (placeholders.some(placeholder => key.includes(placeholder))) {
      return false;
    }

    // Use custom validator if available
    if (config.validator) {
      return config.validator(key);
    }

    // Basic validation - key should be at least 10 characters
    return key.length >= 10;
  }

  /**
   * Check if service is properly configured
   */
  public isServiceConfigured(service: string): boolean {
    const key = this.getApiKey(service);
    return key !== null && this.validateApiKey(service, key);
  }

  /**
   * Get all configured services
   */
  public getConfiguredServices(): string[] {
    const configured: string[] = [];
    for (const [service] of this.keyConfigs) {
      if (this.isServiceConfigured(service)) {
        configured.push(service);
      }
    }
    return configured;
  }

  /**
   * Get all missing required services
   */
  public getMissingRequiredServices(): string[] {
    const missing: string[] = [];
    for (const [service, config] of this.keyConfigs) {
      if (config.required && !this.isServiceConfigured(service)) {
        missing.push(service);
      }
    }
    return missing;
  }

  /**
   * Validate all API keys and return status report
   */
  public async validateAllKeys(): Promise<{
    valid: boolean;
    configured: string[];
    missing: string[];
    invalid: string[];
    warnings: string[];
  }> {
    const configured: string[] = [];
    const missing: string[] = [];
    const invalid: string[] = [];
    const warnings: string[] = [];

    for (const [service, config] of this.keyConfigs) {
      const key = config.key;
      
      if (!key) {
        if (config.required) {
          missing.push(service);
        } else {
          warnings.push(`Optional service ${service} not configured`);
        }
        continue;
      }

      if (this.validateApiKey(service, key)) {
        configured.push(service);
        
        // Update service status
        this.serviceStatus.set(service, {
          name: service,
          configured: true,
          valid: true,
          lastChecked: new Date()
        });
      } else {
        invalid.push(service);
        
        // Update service status
        this.serviceStatus.set(service, {
          name: service,
          configured: true,
          valid: false,
          error: 'Invalid API key format',
          lastChecked: new Date()
        });
      }
    }

    return {
      valid: missing.length === 0 && invalid.length === 0,
      configured,
      missing,
      invalid,
      warnings
    };
  }

  /**
   * Health check for specific service
   */
  public async healthCheckService(service: string): Promise<boolean> {
    const config = this.keyConfigs.get(service);
    const key = this.getApiKey(service);
    
    if (!config || !key || !config.healthCheckUrl) {
      return false;
    }

    try {
      // This is a basic implementation - in practice, you'd make actual API calls
      // For now, we just validate the key format
      const isValid = this.validateApiKey(service, key);
      
      this.serviceStatus.set(service, {
        name: service,
        configured: true,
        valid: isValid,
        error: isValid ? undefined : 'Health check failed',
        lastChecked: new Date()
      });

      return isValid;
    } catch (error) {
      this.serviceStatus.set(service, {
        name: service,
        configured: true,
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      });
      return false;
    }
  }

  /**
   * Get service status
   */
  public getServiceStatus(service: string): ApiServiceStatus | null {
    return this.serviceStatus.get(service) || null;
  }

  /**
   * Get all service statuses
   */
  public getAllServiceStatuses(): ApiServiceStatus[] {
    return Array.from(this.serviceStatus.values());
  }

  /**
   * Get best available search service
   */
  public getBestSearchService(): string | null {
    const searchServices = ['GOOGLE_SEARCH_API_KEY', 'SERPAPI_KEY', 'BING_SEARCH_API_KEY'];
    
    for (const service of searchServices) {
      if (this.isServiceConfigured(service)) {
        return service;
      }
    }
    
    return null;
  }

  /**
   * Get best available AI service
   */
  public getBestAiService(): string | null {
    const aiServices = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_AI_API_KEY'];
    
    for (const service of aiServices) {
      if (this.isServiceConfigured(service)) {
        return service;
      }
    }
    
    return null;
  }

  /**
   * Generate configuration report for debugging
   */
  public generateReport(): string {
    const report = ['=== API Key Configuration Report ===\n'];
    
    for (const [service, config] of this.keyConfigs) {
      const key = config.key;
      const isConfigured = this.isServiceConfigured(service);
      const status = this.serviceStatus.get(service);
      
      report.push(`${service}:`);
      report.push(`  Required: ${config.required ? 'Yes' : 'No'}`);
      report.push(`  Configured: ${key ? 'Yes' : 'No'}`);
      report.push(`  Valid: ${isConfigured ? 'Yes' : 'No'}`);
      
      if (key && !isConfigured) {
        report.push(`  Issue: Invalid key format`);
      }
      
      if (config.fallback && config.fallback.length > 0) {
        report.push(`  Fallbacks: ${config.fallback.join(', ')}`);
      }
      
      if (status?.error) {
        report.push(`  Error: ${status.error}`);
      }
      
      report.push('');
    }

    const validation = this.getMissingRequiredServices();
    if (validation.length > 0) {
      report.push('🚨 MISSING REQUIRED SERVICES:');
      validation.forEach(service => report.push(`  - ${service}`));
      report.push('');
    }

    const configured = this.getConfiguredServices();
    if (configured.length > 0) {
      report.push('✅ CONFIGURED SERVICES:');
      configured.forEach(service => report.push(`  - ${service}`));
    }

    return report.join('\n');
  }
}

// Export singleton instance
export const apiKeyManager = ApiKeyManager.getInstance();
