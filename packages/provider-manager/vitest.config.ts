import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load .env file for tests
config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.config.ts',
        'src/config.ts', // Configuration file
        'src/*/index.ts', // Re-export files
      ],
    },
    include: ['tests/**/*.test.ts'],
    exclude: [
      'node_modules/',
      'dist/',
      'tests/integration/**/*.test.ts', // Skip integration by default
    ],
  },
});
