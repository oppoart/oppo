import { 
  getLiaisonConfig, 
  validateLiaisonConfig, 
  ConfigHelpers,
  defaultLiaisonConfig 
} from '../config';

describe('Liaison Configuration', () => {
  describe('getLiaisonConfig', () => {
    test('should return development config', () => {
      const config = getLiaisonConfig('development');

      expect(config.ui.itemsPerPage).toBe(10);
      expect(config.export.maxItems).toBe(100);
      expect(config.realtime.enabled).toBe(true);
    });

    test('should return production config', () => {
      const config = getLiaisonConfig('production');

      expect(config.export.maxItems).toBe(5000);
      expect(config.realtime.reconnectDelay).toBe(10000);
    });

    test('should return test config with disabled features', () => {
      const config = getLiaisonConfig('test');

      expect(config.realtime.enabled).toBe(false);
    });

    test('should return default config for unknown environment', () => {
      const config = getLiaisonConfig('unknown' as any);

      expect(config).toEqual(defaultLiaisonConfig);
    });
  });

  describe('validateLiaisonConfig', () => {
    test('should return no errors for valid config', () => {
      const validConfig = {
        ui: {
          itemsPerPage: 20,
          kanbanColumns: ['new', 'review']
        },
        export: {
          formats: ['csv', 'json'],
          maxItems: 100
        }
      };

      const errors = validateLiaisonConfig(validConfig);
      expect(errors).toHaveLength(0);
    });

    test('should validate UI configuration', () => {
      const invalidConfig = {
        ui: {
          itemsPerPage: 0,
          kanbanColumns: []
        }
      };

      const errors = validateLiaisonConfig(invalidConfig);
      expect(errors).toContain('UI itemsPerPage must be between 1 and 100');
      expect(errors).toContain('UI kanbanColumns cannot be empty');
    });


    test('should validate Export configuration', () => {
      const invalidConfig = {
        export: {
          maxItems: 0,
          formats: []
        }
      };

      const errors = validateLiaisonConfig(invalidConfig);
      expect(errors).toContain('Export maxItems must be positive');
      expect(errors).toContain('Export formats cannot be empty');
    });

    test('should validate Realtime configuration', () => {
      const invalidConfig = {
        realtime: {
          reconnectDelay: -1,
          maxReconnectAttempts: -1
        }
      };

      const errors = validateLiaisonConfig(invalidConfig);
      expect(errors).toContain('Realtime reconnectDelay must be non-negative');
      expect(errors).toContain('Realtime maxReconnectAttempts must be non-negative');
    });
  });

  describe('ConfigHelpers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should create config from environment variables', () => {
      process.env.WEBSOCKET_ENABLED = 'true';
      process.env.EXPORT_MAX_ITEMS = '500';

      const config = ConfigHelpers.fromEnv();

      expect(config.realtime?.enabled).toBe(true);
      expect(config.export?.maxItems).toBe(500);
    });

    test('should handle missing environment variables', () => {
      const config = ConfigHelpers.fromEnv();

      expect(config.realtime?.enabled).toBe(true); // default when not 'false'
    });


    test('should get WebSocket URL from environment', () => {
      process.env.WEBSOCKET_URL = 'ws://localhost:8080';
      expect(ConfigHelpers.getWebSocketUrl()).toBe('ws://localhost:8080');

      delete process.env.WEBSOCKET_URL;
      process.env.WS_URL = 'ws://localhost:3000';
      expect(ConfigHelpers.getWebSocketUrl()).toBe('ws://localhost:3000');

      delete process.env.WS_URL;
      expect(ConfigHelpers.getWebSocketUrl()).toBeUndefined();
    });
  });
});