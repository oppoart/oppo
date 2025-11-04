import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
