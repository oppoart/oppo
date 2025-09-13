// Test setup file for orchestrator service

// Mock Redis for BullMQ
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    pipeline: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([])
    })
  }));
});

// Mock BullMQ components
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    close: jest.fn().mockResolvedValue(undefined),
    isPaused: jest.fn().mockResolvedValue(false)
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(true)
  })),
  Job: jest.fn()
}));

// Mock Cron
jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation((pattern, callback, onComplete, start, timezone) => ({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
    running: true,
    nextDate: jest.fn().mockReturnValue({
      toDate: () => new Date(Date.now() + 60000) // 1 minute from now
    })
  }))
}));

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockImplementation((path: string) => {
    if (path.includes('config')) {
      return Promise.resolve('{"test": "config"}');
    }
    return Promise.resolve('{}');
  }),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ isDirectory: () => true })
}));

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock AI response',
              tool_calls: []
            }
          }]
        })
      }
    },
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{
          embedding: new Array(1536).fill(0.1)
        }]
      })
    }
  }))
}));

// Mock LlamaIndex
jest.mock('llamaindex', () => ({
  VectorStoreIndex: {
    fromDocuments: jest.fn().mockResolvedValue({
      asQueryEngine: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue({
          response: 'Mock LlamaIndex response'
        })
      })
    })
  },
  Document: jest.fn().mockImplementation((text) => ({ text })),
  StorageContext: {
    fromDefaults: jest.fn().mockReturnValue({})
  },
  Settings: {
    llm: null,
    embedModel: null
  }
}));

// Mock fetch for external API calls
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      items: [],
      webPages: { value: [] },
      organic_results: []
    })
  })
) as jest.Mock;

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Suppress console logs in tests unless debugging
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  global.console = originalConsole;
});