/**
 * Basic usage example for @oppo/job-queue
 *
 * This example demonstrates:
 * - Creating a queue
 * - Adding jobs
 * - Processing jobs with a handler
 * - Tracking progress
 * - Getting queue stats
 */

import {
  JobQueue,
  DiscoveryJobData,
  JobType,
} from '../src';

async function main() {
  console.log('🚀 Starting job queue example\n');

  // 1. Create a queue
  const queue = new JobQueue<DiscoveryJobData>('discovery', {
    redis: {
      host: 'localhost',
      port: 6379,
    },
  });

  console.log('✅ Queue created: discovery\n');

  // 2. Add jobs
  console.log('📥 Adding jobs to queue...');

  const job1 = await queue.add('search-opportunities', {
    query: 'art grants',
    profileId: 'user-123',
    maxResults: 100,
  });

  const job2 = await queue.add('search-opportunities', {
    query: 'art residencies',
    profileId: 'user-123',
    sources: ['web', 'social'],
    maxResults: 50,
  });

  console.log(`✅ Added job: ${job1.id}`);
  console.log(`✅ Added job: ${job2.id}\n`);

  // 3. Process jobs
  console.log('⚙️  Starting job processor...\n');

  queue.process('search-opportunities', async (job) => {
    console.log(`🔄 Processing job ${job.id}: ${job.data.query}`);

    // Simulate work with progress updates
    await JobQueue.updateProgress(job, {
      percentage: 0,
      message: 'Starting search',
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await JobQueue.updateProgress(job, {
      percentage: 50,
      message: 'Halfway done',
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await JobQueue.updateProgress(job, {
      percentage: 100,
      message: 'Completed',
    });

    console.log(`✅ Completed job ${job.id}\n`);

    return {
      results: Math.floor(Math.random() * 20) + 5,
      sources: job.data.sources || ['web'],
    };
  }, 2); // Process 2 jobs concurrently

  // 4. Wait for jobs to complete
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 5. Get queue stats
  const stats = await queue.getStats();
  console.log('📊 Queue stats:');
  console.log(JSON.stringify(stats, null, 2));
  console.log();

  // 6. Clean up
  console.log('🧹 Cleaning up...');
  await queue.close();
  console.log('✅ Queue closed\n');

  console.log('🎉 Example completed!');
}

// Run example
main().catch(console.error);
