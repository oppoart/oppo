/**
 * API Key Manager for validating and managing external service credentials
 */
export class ApiKeyManager {
  private static instance: ApiKeyManager;
  
  static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }
  
  /**
   * Check if an API key is configured and valid format
   */
  isConfigured(keyName: string): boolean {
    const key = process.env[keyName];
    return !!(key && key.length > 10 && !key.includes('your_') && !key.includes('change_me'));
  }
  
  /**
   * Get configured API services
   */
  getConfiguredServices(): string[] {
    const services = [];
    
    if (this.isConfigured('OPENAI_API_KEY')) services.push('openai');
    if (this.isConfigured('FIRECRAWL_API_KEY')) services.push('firecrawl');
    if (this.isConfigured('PERPLEXITY_API_KEY')) services.push('perplexity');
    if (this.isConfigured('GOOGLE_CUSTOM_SEARCH_API_KEY')) services.push('google');
    if (this.isConfigured('TWITTER_BEARER_TOKEN')) services.push('twitter');
    
    return services;
  }
  
  /**
   * Validate all required API keys for basic functionality
   */
  validateRequired(): { valid: boolean; missing: string[] } {
    const required = ['OPENAI_API_KEY', 'DATABASE_URL', 'JWT_SECRET'];
    const missing = required.filter(key => !this.isConfigured(key));
    
    return {
      valid: missing.length === 0,
      missing
    };
  }
}