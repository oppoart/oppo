/**
 * Use Case Router
 *
 * Routes requests to appropriate providers based on use case configuration.
 * Merges default configurations with custom overrides.
 */

import { UseCase, UseCaseConfig } from './types';
import { DEFAULT_USE_CASE_CONFIG } from '../config';

export class UseCaseRouter {
  private useCaseConfigs: Map<UseCase, UseCaseConfig>;

  constructor(customConfigs?: Partial<Record<UseCase, UseCaseConfig>>) {
    this.useCaseConfigs = new Map();

    // Initialize with defaults
    for (const [useCase, config] of Object.entries(DEFAULT_USE_CASE_CONFIG)) {
      this.useCaseConfigs.set(useCase as UseCase, { ...config });
    }

    // Apply custom overrides
    if (customConfigs) {
      for (const [useCase, customConfig] of Object.entries(customConfigs)) {
        if (customConfig) {
          this.updateConfig(useCase as UseCase, customConfig);
        }
      }
    }
  }

  /**
   * Get configuration for a specific use case
   */
  getConfig(useCase: UseCase): UseCaseConfig {
    const config = this.useCaseConfigs.get(useCase);
    if (!config) {
      throw new Error(`No configuration found for use case: ${useCase}`);
    }
    return { ...config }; // Return copy to prevent mutation
  }

  /**
   * Update configuration for a specific use case
   */
  updateConfig(useCase: UseCase, updates: Partial<UseCaseConfig>): void {
    const currentConfig = this.useCaseConfigs.get(useCase);
    if (!currentConfig) {
      throw new Error(`Cannot update unknown use case: ${useCase}`);
    }

    this.useCaseConfigs.set(useCase, {
      ...currentConfig,
      ...updates,
    });
  }

  /**
   * Get provider name for a use case
   */
  getProvider(useCase: UseCase): string {
    return this.getConfig(useCase).provider;
  }

  /**
   * Get model for a use case
   */
  getModel(useCase: UseCase): string | undefined {
    return this.getConfig(useCase).model;
  }

  /**
   * Get fallback providers for a use case
   */
  getFallbackProviders(useCase: UseCase): string[] {
    return this.getConfig(useCase).fallbackProviders || [];
  }

  /**
   * Get all configured use cases
   */
  getAllUseCases(): UseCase[] {
    return Array.from(this.useCaseConfigs.keys());
  }

  /**
   * Get all configurations
   */
  getAllConfigs(): Record<UseCase, UseCaseConfig> {
    const configs: Record<string, UseCaseConfig> = {};
    for (const [useCase, config] of this.useCaseConfigs.entries()) {
      configs[useCase] = { ...config };
    }
    return configs as Record<UseCase, UseCaseConfig>;
  }

  /**
   * Check if caching is enabled for a use case
   */
  isCachingEnabled(useCase: UseCase): boolean {
    return this.getConfig(useCase).enableCaching ?? false;
  }

  /**
   * Get cache TTL for a use case in seconds
   */
  getCacheTTL(useCase: UseCase): number {
    return this.getConfig(useCase).cacheTTL ?? 300; // Default 5 minutes
  }
}
