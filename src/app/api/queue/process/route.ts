import { NextRequest, NextResponse } from 'next/server'
import { JobQueue } from '@/lib/queue/job-queue'
import { CacheService } from '@/lib/queue/cache-service'
import { AnomalyDetector } from '@/lib/algorithm/anomaly-detector'
import { PerformanceCollector } from '@/lib/algorithm/performance-collector'
import { InstagramTrendCollector } from '@/lib/trends/instagram-collector'
import { TrendManager } from '@/lib/trends/trend-manager'
import { ContentGenerator } from '@/lib/ai/content-generator'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max for processing jobs

// Map of job processors
const jobProcessors = {
  algorithm_detection: processAlgorithmDetection,
  performance_collection: processPerformanceCollection,
  trend_collection: processTrendCollection,
  content_generation: processContentGeneration,
  instagram_sync: processInstagramSync,
  brand_discovery: processBrandDiscovery
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (cron secret or authenticated user)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const queue = JobQueue.getInstance()
    const cache = CacheService.getInstance()
    
    // Clean up expired cache entries
    await cache.cleanupExpired()
    
    // Process multiple jobs in this execution (up to 10 or 50 seconds)
    const startTime = Date.now()
    const maxExecutionTime = 50000 // 50 seconds
    const maxJobs = 10
    let jobsProcessed = 0
    
    console.log('Starting queue processing...')
    
    while (jobsProcessed < maxJobs && (Date.now() - startTime) < maxExecutionTime) {
      // Get next job from queue
      const job = await queue.getNextJob()
      
      if (!job) {
        console.log('No pending jobs in queue')
        break
      }
      
      console.log(`Processing job ${job.id} of type ${job.type}`)
      
      try {
        // Process the job based on its type
        const processor = jobProcessors[job.type as keyof typeof jobProcessors]
        
        if (!processor) {
          throw new Error(`Unknown job type: ${job.type}`)
        }
        
        const result = await processor(job.payload, job.user_id)
        await queue.completeJob(job.id, result)
        
        jobsProcessed++
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error)
        await queue.failJob(
          job.id, 
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }
    
    // Get queue stats
    const pendingCount = await queue.getPendingJobsCount()
    const processingCount = await queue.getProcessingJobsCount()
    
    return NextResponse.json({
      success: true,
      jobsProcessed,
      executionTime: Date.now() - startTime,
      queueStatus: {
        pending: pendingCount,
        processing: processingCount
      }
    })
    
  } catch (error) {
    console.error('Queue processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process queue' },
      { status: 500 }
    )
  }
}

// Individual job processors
async function processAlgorithmDetection(payload: any, userId?: string) {
  const detector = new AnomalyDetector()
  const result = await detector.detectChanges()
  
  // Store insights if significant changes detected
  if (result.changes.length > 0) {
    const supabase = getSupabaseAdmin()
    for (const change of result.changes) {
      await supabase
        .from('algorithm_insights')
        .insert({
          change_type: change.type,
          description: change.description,
          confidence_score: change.confidence,
          detected_at: new Date().toISOString()
        })
    }
  }
  
  return result
}

async function processPerformanceCollection(payload: any, userId?: string) {
  if (!userId) {
    throw new Error('User ID required for performance collection')
  }
  
  const collector = new PerformanceCollector()
  const cache = CacheService.getInstance()
  
  // Check cache first
  const cacheKey = `performance:${userId}:${new Date().toISOString().split('T')[0]}`
  const cached = await cache.get('algorithm_detection', cacheKey)
  
  if (cached) {
    return cached
  }
  
  // Collect performance data
  const result = await collector.collectUserPerformance(userId)
  
  // Cache the result
  await cache.set('algorithm_detection', cacheKey, result, { ttl: 3600 })
  
  return result
}

async function processTrendCollection(payload: any, userId?: string) {
  const { niche } = payload || {}
  
  if (!niche) {
    throw new Error('Niche required for trend collection')
  }
  
  const supabase = getSupabaseAdmin()
  const cache = CacheService.getInstance()
  
  // Check cache
  const cacheKey = `trends:${niche}:${new Date().toISOString().split('T')[0]}`
  const cached = await cache.get('trend_data', cacheKey)
  
  if (cached) {
    return cached
  }
  
  // Get Instagram token
  const { data: tokenData } = await supabase
    .from('user_tokens')
    .select('instagram_access_token')
    .not('instagram_access_token', 'is', null)
    .limit(1)
    .single()
  
  if (!tokenData?.instagram_access_token) {
    throw new Error('No Instagram access token available')
  }
  
  const collector = new InstagramTrendCollector(tokenData.instagram_access_token)
  const trends = await collector.collectTrends(niche)
  
  // Save trends
  await TrendManager.saveTrends(trends)
  
  // Cache results
  await cache.set('trend_data', cacheKey, trends, { ttl: 21600 })
  
  return { trends: trends.length, niche }
}

async function processContentGeneration(payload: any, userId?: string) {
  if (!userId) {
    throw new Error('User ID required for content generation')
  }
  
  const generator = new ContentGenerator()
  const cache = CacheService.getInstance()
  
  // Check cache
  const weekStart = getWeekStart()
  const cacheKey = `content:${userId}:${weekStart}`
  const cached = await cache.get('openai_response', cacheKey)
  
  if (cached) {
    return cached
  }
  
  // Generate content
  const result = await generator.generateWeeklyPlan(userId)
  
  // Cache for the week
  await cache.set('openai_response', cacheKey, result, { ttl: 604800 }) // 7 days
  
  return result
}

async function processInstagramSync(payload: any, userId?: string) {
  if (!userId) {
    throw new Error('User ID required for Instagram sync')
  }
  
  const supabase = getSupabaseAdmin()
  const cache = CacheService.getInstance()
  
  // Get user's Instagram token
  const { data: tokenData } = await supabase
    .from('user_tokens')
    .select('instagram_access_token, instagram_user_id')
    .eq('user_id', userId)
    .single()
  
  if (!tokenData?.instagram_access_token) {
    throw new Error('No Instagram access token for user')
  }
  
  const { instagram_access_token, instagram_user_id } = tokenData
  
  // Fetch Instagram profile with caching
  const profileCacheKey = `profile:${instagram_user_id}`
  let profileData = await cache.get('instagram_profile', profileCacheKey)
  
  if (!profileData) {
    const profileResponse = await fetch(
      `https://graph.instagram.com/v21.0/${instagram_user_id}?fields=id,username,media_count,followers_count&access_token=${instagram_access_token}`
    )
    profileData = await profileResponse.json()
    await cache.set('instagram_profile', profileCacheKey, profileData, { ttl: 1800 })
  }
  
  // Fetch recent media with caching
  const mediaCacheKey = `media:${instagram_user_id}`
  let mediaData = await cache.get('instagram_media', mediaCacheKey)
  
  if (!mediaData) {
    const mediaResponse = await fetch(
      `https://graph.instagram.com/v21.0/${instagram_user_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25&access_token=${instagram_access_token}`
    )
    mediaData = await mediaResponse.json()
    await cache.set('instagram_media', mediaCacheKey, mediaData, { ttl: 3600 })
  }
  
  // Update profile in database
  await supabase
    .from('profiles')
    .update({
      follower_count: profileData.followers_count,
      posts_count: profileData.media_count,
      last_sync_at: new Date().toISOString()
    })
    .eq('id', userId)
  
  // Update posts in database
  if (mediaData.data && mediaData.data.length > 0) {
    const posts = mediaData.data.map((post: any) => ({
      id: post.id,
      profile_id: userId,
      caption: post.caption,
      media_type: post.media_type,
      media_url: post.media_url,
      permalink: post.permalink,
      timestamp: post.timestamp,
      like_count: post.like_count || 0,
      comments_count: post.comments_count || 0
    }))
    
    await supabase
      .from('instagram_posts')
      .upsert(posts, { onConflict: 'id' })
  }
  
  return {
    profile_updated: true,
    posts_synced: mediaData.data?.length || 0
  }
}

async function processBrandDiscovery(payload: any, userId?: string) {
  // Placeholder for brand discovery processing
  // This would involve searching for brands, matching algorithms, etc.
  return {
    brands_discovered: 0,
    message: 'Brand discovery processing not yet implemented'
  }
}

function getWeekStart(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek
  const weekStart = new Date(now.setDate(diff))
  return weekStart.toISOString().split('T')[0]
}