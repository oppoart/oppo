# @oppo/job-queue

Simple BullMQ wrapper for job queue management in OPPO.

## Features

- ✅ **Type-safe**: Full TypeScript support with type-safe job handlers
- ✅ **Simple API**: Easy to use `add()`, `process()`, `pause()`, `resume()` methods
- ✅ **Built-in retry**: 3 retries with exponential backoff by default
- ✅ **Progress tracking**: Track job progress with `updateProgress()`
- ✅ **Event handling**: Monitor job completion, failures, and progress
- ✅ **Pre-defined handlers**: Ready-to-use handlers for common tasks

## Installation

```bash
pnpm add @oppo/job-queue
```

**Dependencies:**
- `bullmq` ^5.0.0
- `ioredis` ^5.0.0

## Quick Start

### Basic Usage

```typescript
import { JobQueue, DiscoveryJobData } from '@oppo/job-queue';

// Create a queue
const queue = new JobQueue<DiscoveryJobData>('discovery');

// Add a job
await queue.add('search-opportunities', {
  query: 'art grants',
  profileId: 'user-123',
  maxResults: 100,
});

// Process jobs
queue.process('search-opportunities', async (job) => {
  console.log('Processing:', job.data);

  // Update progress
  await JobQueue.updateProgress(job, {
    percentage: 50,
    message: 'Halfway done',
  });

  // Do work...

  return { success: true };
});
```

### Using Pre-defined Handlers

```typescript
import {
  createDiscoveryQueue,
  discoveryJobHandler,
} from '@oppo/job-queue';

// Create queue with helper
const queue = createDiscoveryQueue(process.env.REDIS_URL);

// Use pre-defined handler
queue.process('search-opportunities', discoveryJobHandler);

// Add jobs
await queue.add('search-opportunities', {
  query: 'art residencies',
  sources: ['web', 'social'],
  maxResults: 50,
});
```

## API Reference

### JobQueue Class

#### Constructor

```typescript
new JobQueue<T>(queueName: string, config?: QueueConfig)
```

**Options:**
```typescript
interface QueueConfig {
  redis?: {
    host?: string;      // Default: 'localhost'
    port?: number;      // Default: 6379
    password?: string;
    db?: number;        // Default: 0
  };
  defaultJobOptions?: JobsOptions; // BullMQ job options
}
```

#### Methods

**`add(jobName: string, data: T, options?: JobsOptions): Promise<Job<T>>`**

Add a single job to the queue.

```typescript
await queue.add('process-data', { id: '123' });
```

**`addBulk(jobs: Array<{name, data, opts?}>): Promise<Job<T>[]>`**

Add multiple jobs in bulk.

```typescript
await queue.addBulk([
  { name: 'job-1', data: { id: '1' } },
  { name: 'job-2', data: { id: '2' } },
]);
```

**`process(jobName: string, handler: JobHandler<T>, concurrency?: number): void`**

Process jobs with a handler function.

```typescript
queue.process('my-job', async (job) => {
  // Handle job
  return { success: true };
}, 5); // Process 5 jobs concurrently
```

**`pause(): Promise<void>`**

Pause the queue.

```typescript
await queue.pause();
```

**`resume(): Promise<void>`**

Resume the queue.

```typescript
await queue.resume();
```

**`getStats(): Promise<QueueStats>`**

Get queue statistics.

```typescript
const stats = await queue.getStats();
// { waiting: 10, active: 2, completed: 100, failed: 5, delayed: 0 }
```

**`clean(grace?: number, limit?: number): Promise<void>`**

Clean old jobs from the queue.

```typescript
await queue.clean(24 * 3600 * 1000); // Clean jobs older than 24 hours
```

**`close(): Promise<void>`**

Close queue and all connections.

```typescript
await queue.close();
```

#### Static Methods

**`JobQueue.updateProgress(job: Job, progress: JobProgress): Promise<void>`**

Update job progress from within a handler.

```typescript
await JobQueue.updateProgress(job, {
  percentage: 75,
  message: 'Almost done',
});
```

**`JobQueue.log(job: Job, message: string): Promise<void>`**

Log a message from within a handler.

```typescript
await JobQueue.log(job, 'Processing started');
```

## Job Types

### Pre-defined Job Data Types

```typescript
// Discovery jobs
interface DiscoveryJobData {
  query: string;
  sources?: string[];
  maxResults?: number;
  userId?: string;
  profileId?: string;
}

// Scraping jobs
interface ScrapingJobData {
  url: string;
  selector?: string;
  waitFor?: number;
  userId?: string;
  profileId?: string;
}

// Analysis jobs
interface AnalysisJobData {
  opportunityId: string;
  analysisType: 'relevance' | 'sentiment' | 'entity';
  userId?: string;
  profileId?: string;
}
```

## Pre-defined Handlers

### Discovery Handler

```typescript
import { createDiscoveryQueue, discoveryJobHandler } from '@oppo/job-queue';

const queue = createDiscoveryQueue();
queue.process('search', discoveryJobHandler);
```

### Scraping Handler

```typescript
import { createScrapingQueue, scrapingJobHandler } from '@oppo/job-queue';

const queue = createScrapingQueue();
queue.process('scrape', scrapingJobHandler);
```

### Analysis Handler

```typescript
import { createAnalysisQueue, analysisJobHandler } from '@oppo/job-queue';

const queue = createAnalysisQueue();
queue.process('analyze', analysisJobHandler);
```

## Advanced Usage

### Custom Job Handler with Progress

```typescript
queue.process('complex-task', async (job) => {
  const { data } = job;

  // Step 1
  await JobQueue.log(job, 'Starting step 1');
  await JobQueue.updateProgress(job, { percentage: 25 });
  // ... do work

  // Step 2
  await JobQueue.log(job, 'Starting step 2');
  await JobQueue.updateProgress(job, { percentage: 50 });
  // ... do work

  // Step 3
  await JobQueue.log(job, 'Starting step 3');
  await JobQueue.updateProgress(job, { percentage: 75 });
  // ... do work

  // Complete
  await JobQueue.updateProgress(job, { percentage: 100 });

  return { success: true, result: 'done' };
});
```

### Custom Retry Configuration

```typescript
await queue.add('retry-job', data, {
  attempts: 5, // Try 5 times
  backoff: {
    type: 'exponential',
    delay: 5000, // Start with 5 second delay
  },
});
```

### Delayed Jobs

```typescript
await queue.add('delayed-job', data, {
  delay: 60000, // Run after 1 minute
});
```

## Configuration

### Redis Connection

```typescript
// Default (localhost)
const queue = new JobQueue('my-queue');

// Custom Redis
const queue = new JobQueue('my-queue', {
  redis: {
    host: 'redis.example.com',
    port: 6380,
    password: 'secret',
    db: 1,
  },
});

// From environment variable
const queue = createDiscoveryQueue(process.env.REDIS_URL);
```

### Default Job Options

```typescript
const queue = new JobQueue('my-queue', {
  defaultJobOptions: {
    attempts: 5,
    removeOnComplete: true,
    removeOnFail: false,
  },
});
```

## Best Practices

1. **Always close queues** when done:
   ```typescript
   await queue.close();
   ```

2. **Use type-safe job data** with TypeScript:
   ```typescript
   const queue = new JobQueue<MyJobData>('my-queue');
   ```

3. **Handle errors** in job handlers:
   ```typescript
   queue.process('my-job', async (job) => {
     try {
       // Do work
     } catch (error) {
       await JobQueue.log(job, `Error: ${error.message}`);
       throw error; // Will trigger retry
     }
   });
   ```

4. **Monitor queue health** with stats:
   ```typescript
   const stats = await queue.getStats();
   if (stats.failed > 100) {
     // Alert!
   }
   ```

5. **Clean up old jobs** periodically:
   ```typescript
   setInterval(async () => {
     await queue.clean();
   }, 24 * 3600 * 1000); // Daily
   ```

## Architecture

```
@oppo/job-queue
├── JobQueue (main class)
│   ├── BullMQ Queue wrapper
│   ├── Worker management
│   └── Event handling
├── Pre-defined handlers
│   ├── Discovery
│   ├── Scraping
│   └── Analysis
└── Type definitions
    ├── Job data types
    ├── Job status
    └── Queue config
```

## Dependencies

- **BullMQ**: Robust job queue based on Redis
- **ioredis**: High-performance Redis client

## License

MIT
