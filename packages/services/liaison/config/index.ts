import { LiaisonConfig, ExportFormat } from '../types';

export const defaultLiaisonConfig: LiaisonConfig = {
  ui: {
    theme: 'light',
    kanbanColumns: ['new', 'reviewing', 'applying', 'submitted', 'rejected'],
    defaultView: 'kanban',
    itemsPerPage: 20
  },
  export: {
    formats: ['csv', 'json'],
    maxItems: 1000
  },
  realtime: {
    enabled: true,
    reconnectDelay: 5000,
    maxReconnectAttempts: 10
  }
};

export const productionLiaisonConfig: Partial<LiaisonConfig> = {
  export: {
    formats: ['csv', 'json'],
    maxItems: 5000 // Higher limit for production
  },
  realtime: {
    enabled: true,
    reconnectDelay: 10000, // Longer delay in production
    maxReconnectAttempts: 15
  }
};

export const developmentLiaisonConfig: Partial<LiaisonConfig> = {
  ui: {
    theme: 'light',
    kanbanColumns: ['new', 'reviewing', 'applying', 'submitted', 'rejected'],
    defaultView: 'kanban',
    itemsPerPage: 10 // Smaller page size for development
  },
  export: {
    formats: ['csv', 'json'],
    maxItems: 100 // Lower limit for development
  },
  realtime: {
    enabled: true,
    reconnectDelay: 3000,
    maxReconnectAttempts: 5
  }
};

/**
 * Get liaison configuration based on environment
 */
export function getLiaisonConfig(env: 'development' | 'production' | 'test' = 'development'): LiaisonConfig {
  const baseConfig = { ...defaultLiaisonConfig };
  
  switch (env) {
    case 'production':
      return mergeConfigs(baseConfig, productionLiaisonConfig);
    case 'development':
      return mergeConfigs(baseConfig, developmentLiaisonConfig);
    case 'test':
      return {
        ...baseConfig,
        realtime: {
          ...baseConfig.realtime,
          enabled: false // Disable WebSocket in tests
        }
      };
    default:
      return baseConfig;
  }
}

/**
 * Merge configuration objects deeply
 */
function mergeConfigs(base: LiaisonConfig, override: Partial<LiaisonConfig>): LiaisonConfig {
  return {
    ui: { ...base.ui, ...override.ui },
    export: { ...base.export, ...override.export },
    realtime: { ...base.realtime, ...override.realtime }
  };
}

/**
 * Validate liaison configuration
 */
export function validateLiaisonConfig(config: Partial<LiaisonConfig>): string[] {
  const errors: string[] = [];

  // UI validation
  if (config.ui) {
    if (config.ui.itemsPerPage && (config.ui.itemsPerPage < 1 || config.ui.itemsPerPage > 100)) {
      errors.push('UI itemsPerPage must be between 1 and 100');
    }
    
    if (config.ui.kanbanColumns && config.ui.kanbanColumns.length === 0) {
      errors.push('UI kanbanColumns cannot be empty');
    }
  }


  // Export validation
  if (config.export) {
    if (config.export.maxItems && config.export.maxItems < 1) {
      errors.push('Export maxItems must be positive');
    }
    
    if (config.export.formats && config.export.formats.length === 0) {
      errors.push('Export formats cannot be empty');
    }
  }

  // Realtime validation
  if (config.realtime) {
    if (config.realtime.reconnectDelay && config.realtime.reconnectDelay < 0) {
      errors.push('Realtime reconnectDelay must be non-negative');
    }
    
    if (config.realtime.maxReconnectAttempts && config.realtime.maxReconnectAttempts < 0) {
      errors.push('Realtime maxReconnectAttempts must be non-negative');
    }
  }

  return errors;
}

/**
 * Environment-specific configuration helpers
 */
export const ConfigHelpers = {
  /**
   * Create configuration from environment variables
   */
  fromEnv(): Partial<LiaisonConfig> {
    return {
      realtime: {
        enabled: process.env.WEBSOCKET_ENABLED !== 'false',
        reconnectDelay: process.env.WEBSOCKET_RECONNECT_DELAY ? 
          parseInt(process.env.WEBSOCKET_RECONNECT_DELAY) : undefined,
        maxReconnectAttempts: process.env.WEBSOCKET_MAX_RECONNECT_ATTEMPTS ? 
          parseInt(process.env.WEBSOCKET_MAX_RECONNECT_ATTEMPTS) : undefined
      },
      export: {
        formats: ['csv', 'json'] as ExportFormat[],
        maxItems: process.env.EXPORT_MAX_ITEMS ? 
          parseInt(process.env.EXPORT_MAX_ITEMS) : undefined
      }
    };
  },


  /**
   * Get WebSocket URL from environment
   */
  getWebSocketUrl(): string | undefined {
    return process.env.WEBSOCKET_URL || process.env.WS_URL;
  }
};