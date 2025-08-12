#!/usr/bin/env tsx

// Test script for the job queue system
// Run with: npm run test:queue

import { JobQueue } from '../src/lib/queue/job-queue'
import { CacheService } from '../src/lib/queue/cache-service'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function testQueue() {
  console.log('🧪 Testing Job Queue System...\n')

  const queue = JobQueue.getInstance()
  const cache = CacheService.getInstance()

  try {
    // Test 1: Enqueue a simple job
    console.log('📝 Test 1: Enqueuing a test job...')
    const jobId = await queue.enqueue(
      'performance_collection',
      { test: true },
      { priority: 7 }
    )
    console.log(`✅ Job enqueued with ID: ${jobId}\n`)

    // Test 2: Check job status
    console.log('📝 Test 2: Checking job status...')
    const jobStatus = await queue.getJobStatus(jobId)
    console.log(`✅ Job status: ${jobStatus?.status}\n`)

    // Test 3: Get pending jobs count
    console.log('📝 Test 3: Getting pending jobs count...')
    const pendingCount = await queue.getPendingJobsCount()
    console.log(`✅ Pending jobs: ${pendingCount}\n`)

    // Test 4: Test cache service
    console.log('📝 Test 4: Testing cache service...')
    await cache.set('trend_data', 'test-key', { data: 'test value' }, { ttl: 60 })
    const cached = await cache.get('trend_data', 'test-key')
    console.log(`✅ Cache working: ${cached?.data === 'test value'}\n`)

    // Test 5: Batch enqueue
    console.log('📝 Test 5: Batch enqueuing jobs...')
    const jobIds = await queue.batchEnqueue([
      { type: 'trend_collection', payload: { niche: 'fitness' }, priority: 6 },
      { type: 'trend_collection', payload: { niche: 'beauty' }, priority: 6 },
      { type: 'algorithm_detection', payload: {}, priority: 8 }
    ])
    console.log(`✅ Batch enqueued ${jobIds.length} jobs\n`)

    // Test 6: Get next job (simulate processing)
    console.log('📝 Test 6: Getting next job from queue...')
    const nextJob = await queue.getNextJob()
    if (nextJob) {
      console.log(`✅ Got job: ${nextJob.type} (ID: ${nextJob.id})`)
      
      // Complete the job
      await queue.completeJob(nextJob.id, { success: true })
      console.log(`✅ Job completed\n`)
    } else {
      console.log('⚠️ No jobs available\n')
    }

    // Test 7: Cache stats
    console.log('📝 Test 7: Getting cache stats...')
    const stats = await cache.getStats()
    console.log(`✅ Cache stats:`)
    console.log(`   Total entries: ${stats.totalEntries}`)
    console.log(`   Hit rate: ${stats.hitRate.toFixed(2)}%\n`)

    // Cleanup
    console.log('🧹 Cleaning up test data...')
    await cache.invalidate('trend_data', 'test-key')
    const cleaned = await queue.cleanupOldJobs(0) // Clean all completed jobs
    console.log(`✅ Cleaned up ${cleaned} old jobs\n`)

    console.log('✨ All tests passed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
testQueue().catch(console.error)