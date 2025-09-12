import * as path from 'path';
import * as fs from 'fs/promises';

// Global test setup
beforeAll(async () => {
  console.log('Setting up Sentinel test environment...');
  
  // Create temporary directories for testing
  const tempDir = path.join(__dirname, '../../temp');
  try {
    await fs.mkdir(tempDir, { recursive: true });
    console.log('Created temporary test directory');
  } catch (error) {
    console.warn('Failed to create temp directory:', error);
  }
});

afterAll(async () => {
  console.log('Cleaning up Sentinel test environment...');
  
  // Clean up temporary directories
  const tempDir = path.join(__dirname, '../../temp');
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log('Cleaned up temporary test directory');
  } catch (error) {
    console.warn('Failed to clean up temp directory:', error);
  }
});

// Extend Jest matchers for better testing
expect.extend({
  toBeValidOpportunity(received) {
    const pass = received && 
                 typeof received.title === 'string' && received.title.length > 0 &&
                 typeof received.description === 'string' && received.description.length > 0 &&
                 typeof received.url === 'string' && received.url.startsWith('http') &&
                 typeof received.sourceType === 'string' &&
                 typeof received.status === 'string' &&
                 typeof received.processed === 'boolean' &&
                 typeof received.applied === 'boolean' &&
                 typeof received.starred === 'boolean' &&
                 Array.isArray(received.tags);

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid opportunity`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid opportunity`,
        pass: false,
      };
    }
  },
  
  toHaveValidDiscoveryResult(received) {
    const pass = received &&
                 typeof received.sourceId === 'string' &&
                 typeof received.sourceName === 'string' &&
                 typeof received.sourceType === 'string' &&
                 Array.isArray(received.opportunities) &&
                 Array.isArray(received.errors) &&
                 typeof received.processingTimeMs === 'number' &&
                 received.processingTimeMs >= 0 &&
                 typeof received.metadata === 'object';

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid discovery result`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid discovery result`,
        pass: false,
      };
    }
  }
});

// Suppress console warnings in tests unless VERBOSE_TESTS is set
if (!process.env.VERBOSE_TESTS) {
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  console.warn = (...args: any[]) => {
    // Only show warnings that might be important for tests
    const message = args.join(' ');
    if (message.includes('FAIL') || message.includes('ERROR') || message.includes('timeout')) {
      originalConsoleWarn.apply(console, args);
    }
  };
  
  console.error = (...args: any[]) => {
    // Always show errors
    originalConsoleError.apply(console, args);
  };
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONITORING_ENABLED = 'false';

// Mock external API calls by default
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as jest.MockedFunction<typeof fetch>;

console.log('Sentinel test environment ready');