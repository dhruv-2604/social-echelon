import { NextRequest, NextResponse } from 'next/server'
import { JobQueue } from '@/lib/queue/job-queue'
import { CacheService } from '@/lib/queue/cache-service'
import { AnomalyDetector } from '@/lib/algorithm/anomaly-detector'
import { PerformanceCollector } from '@/lib/algorithm/performance-collector'
import { ApifyInstagramCollector } from '@/lib/trends/apify-instagram-collector'
import { TrendManager } from '@/lib/trends/trend-manager'
import { ContentGenerator } from '@/lib/ai/content-generator'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withSecurityHeaders } from '@/lib/validation/middleware'
import { TrendData } from '@/lib/trends/types'

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

// Helper to verify cron authorization
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  
  return isVercelCron || (!!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`)
}

export const POST = withSecurityHeaders(
  async (request: NextRequest) => {
    try {
      // Verify cron authorization only
      if (!verifyCronAuth(request)) {
        return NextResponse.json({ 
          error: 'Unauthorized - Queue processing is restricted to scheduled jobs only' 
        }, { status: 401 })
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
)

// Individual job processors
async function processAlgorithmDetection(payload: any, userId?: string) {
  const detector = new AnomalyDetector()
  const changes = await detector.detectChanges()
  
  // Store insights if significant changes detected
  if (changes.length > 0) {
    const supabase = getSupabaseAdmin()
    for (const change of changes) {
      const description = `${change.metric}: ${change.percentChange > 0 ? '+' : ''}${change.percentChange.toFixed(1)}% change detected (${change.beforeValue} → ${change.afterValue})`
      await supabase
        .from('algorithm_insights')
        .insert({
          change_type: change.type,
          description,
          confidence_score: change.confidence,
          detected_at: new Date().toISOString()
        })
    }
  }
  
  return { changes }
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
  const result = await collector.collectDailySummary(userId)
  
  // Cache the result  
  await cache.set('algorithm_detection', cacheKey, result, { ttl: 3600 })
  
  return result
}

async function processTrendCollection(payload: any, userId?: string) {
  const { niche } = payload || {}

  if (!niche) {
    throw new Error('Niche required for trend collection')
  }

  const cache = CacheService.getInstance()

  // Check cache
  const cacheKey = `trends:${niche}:${new Date().toISOString().split('T')[0]}`
  const cached = await cache.get('trend_data', cacheKey)

  if (cached) {
    return cached
  }

  // Use Apify Instagram collector (no token needed - uses APIFY_TOKEN env var)
  const collector = new ApifyInstagramCollector()

  // Get relevant hashtags for the niche
  const nicheHashtags = getNicheHashtags(niche)

  // Collect real Instagram data via Apify
  const apifyTrends = await collector.collectHashtagTrends(nicheHashtags.slice(0, 5), 200)

  // Convert Apify format to TrendData format
  const trends: TrendData[] = apifyTrends.map(trend => ({
    niche,
    trend_type: 'hashtag' as const,
    trend_name: `#${trend.hashtag}`,
    growth_velocity: Math.round(trend.growthRate || 0),
    current_volume: trend.postCount,
    engagement_rate: trend.avgEngagement,
    saturation_level: Math.min(100, trend.postCount / 100),
    confidence_score: trend.growthRate && trend.growthRate > 10 ? 80 : 70,
    trend_phase: (trend.growthRate && trend.growthRate > 20 ? 'growing' :
                  trend.growthRate && trend.growthRate > 0 ? 'emerging' : 'declining') as 'emerging' | 'growing' | 'peak' | 'declining',
    related_hashtags: [],
    example_posts: trend.topPosts.slice(0, 5).map(p => ({
      caption: p.caption?.substring(0, 200),
      likes: p.likeCount,
      comments: p.commentCount
    })),
    optimal_posting_times: [9, 12, 17, 20] // Default optimal times in UTC
  }))

  // Save trends
  await TrendManager.saveTrends(trends)

  // Cache results
  await cache.set('trend_data', cacheKey, trends, { ttl: 21600 })

  return { trends: trends.length, niche }
}

// Helper function to get relevant hashtags for each niche
function getNicheHashtags(niche: string): string[] {
  const hashtagMap: Record<string, string[]> = {
    fitness: ['fitness', 'workout', 'fitnessmotivation', 'gym', 'fitfam'],
    beauty: ['beauty', 'makeup', 'skincare', 'beautytips', 'makeuptutorial'],
    lifestyle: ['lifestyle', 'lifestyleblogger', 'dailylife', 'livingmybestlife', 'selfcare'],
    fashion: ['fashion', 'ootd', 'fashionista', 'style', 'fashionblogger'],
    food: ['foodie', 'foodstagram', 'foodporn', 'recipe', 'cooking'],
    travel: ['travel', 'wanderlust', 'travelgram', 'vacation', 'explore'],
    business: ['entrepreneur', 'business', 'startup', 'businessowner', 'success'],
    parenting: ['parenting', 'momlife', 'parenthood', 'kids', 'family'],
    tech: ['tech', 'technology', 'innovation', 'coding', 'ai'],
    education: ['education', 'learning', 'study', 'students', 'teaching']
  }
  return hashtagMap[niche.toLowerCase()] || ['trending', niche]
}

async function processContentGeneration(payload: any, userId?: string) {
  // Content generation requires complex parameters
  // For now, return a placeholder until properly integrated
  return {
    message: 'Content generation via queue not yet implemented',
    userId
  }
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
      user_id: userId,
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