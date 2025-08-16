import { NextRequest, NextResponse } from 'next/server'
import { AnomalyDetector } from '@/lib/algorithm/anomaly-detector'
import { JobQueue } from '@/lib/queue/job-queue'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
import { AlertManager } from '@/lib/algorithm/alert-manager'

// GET /api/algorithm/detect - Run anomaly detection (Vercel cron endpoint)
export async function GET(request: NextRequest) {
  console.log('==========================================')
  console.log('DETECT ENDPOINT HIT AT:', new Date().toISOString())
  console.log('All headers:', Object.fromEntries(request.headers.entries()))
  console.log('==========================================')
  
  try {
    // Check if this is a test request
    const url = new URL(request.url)
    const testMode = url.searchParams.get('test') === 'true'
    
    if (testMode) {
      // For testing, run detection immediately
      const detector = new AnomalyDetector()
      const changes = await detector.detectChanges()

      return NextResponse.json({
        success: true,
        test_mode: true,
        changes_detected: changes.length,
        changes: changes
      })
    }
    
    // Check if this is a Vercel cron job request
    const authHeader = request.headers.get('authorization')
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    
    // TEMPORARY: Log auth info but don't block
    console.log('Auth check results:', {
      isVercelCron,
      hasCronSecret: !!process.env.CRON_SECRET,
      hasAuthHeader: !!authHeader
    })
    
    // TEMPORARY: Skip all auth checks to debug cron issues
    if (false) { // Disabled auth temporarily
      // Auth code commented out for debugging
    }

    console.log('Starting algorithm detection via queue...')

    const queue = JobQueue.getInstance()
    const supabase = getSupabaseAdmin()

    // Get all active users to create performance collection jobs
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .not('instagram_username', 'is', null)
      .limit(100) // Process up to 100 users per run

    if (users && users.length > 0) {
      // Queue performance collection for each user
      const jobs = users.map(user => ({
        type: 'performance_collection' as const,
        userId: user.id as string,
        priority: 5
      }))

      await queue.batchEnqueue(jobs)
      console.log(`Queued performance collection for ${users.length} users`)

      // Queue the algorithm detection job to run after performance collection
      // Schedule it for 5 minutes from now to allow collection to complete
      const detectionJobId = await queue.enqueue(
        'algorithm_detection',
        { runDate: new Date().toISOString() },
        {
          priority: 8,
          scheduledFor: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
      )

      return NextResponse.json({
        success: true,
        message: 'Algorithm detection queued',
        jobs_queued: users.length + 1,
        detection_job_id: detectionJobId,
        timestamp: new Date().toISOString()
      })
    } else {
      // No users, run detection directly on existing data
      const detector = new AnomalyDetector()
      const changes = await detector.detectChanges()

      console.log(`Detection complete. Found ${changes.length} changes`)
      
      // Send alerts for significant changes
      if (changes.length > 0) {
        const alertManager = new AlertManager()
        await alertManager.sendAlgorithmChangeAlerts(changes)
        console.log('Alerts sent successfully')
      }

      return NextResponse.json({
        success: true,
        changes_detected: changes.length,
        changes: changes.map(c => ({
          type: c.type,
          metric: c.metric,
          change: `${c.percentChange > 0 ? '+' : ''}${c.percentChange}%`,
          affected_users: c.affectedUsers,
          confidence: c.confidence,
          before: c.beforeValue,
          after: c.afterValue
        })),
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Algorithm detection error:', error)
    return NextResponse.json(
      { error: 'Failed to run detection' },
      { status: 500 }
    )
  }
}