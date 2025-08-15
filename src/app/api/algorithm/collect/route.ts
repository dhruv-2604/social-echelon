import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { PerformanceCollector } from '@/lib/algorithm/performance-collector'

// GET /api/algorithm/collect - Daily performance collection (runs once per day)
// Vercel crons call GET endpoints, not POST
export async function GET(request: NextRequest) {
  try {
    // Check if this is a Vercel cron job request
    // Vercel sets a special header for cron jobs
    const authHeader = request.headers.get('authorization')
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    
    // If this is a Vercel cron request, allow it
    if (!isVercelCron) {
      // Not a Vercel cron, check for manual trigger with secret
      if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Not authorized, check for test mode
        const url = new URL(request.url)
        const testMode = url.searchParams.get('test') === 'true'
        
        if (!testMode) {
          return NextResponse.json({ error: 'This endpoint is for scheduled jobs only' }, { status: 403 })
        }
        
        // Test mode - collect for current user only
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const userId = cookieStore.get('user_id')?.value

        if (!userId) {
          return NextResponse.json({ error: 'Not authenticated for test mode' }, { status: 401 })
        }

        console.log('Running test collection for user:', userId)
        const collector = new PerformanceCollector()
        const summary = await collector.collectDailySummary(userId)

        return NextResponse.json({
          success: true,
          mode: 'test',
          summary,
          message: 'Test collection completed'
        })
      }
    }

    // This is a cron job request - collect for all users
    console.log('Starting daily performance collection (cron job)...')
    console.log('Request headers:', {
      'x-vercel-cron': request.headers.get('x-vercel-cron'),
      'authorization': request.headers.get('authorization') ? 'present' : 'not present',
      'isVercelCron': isVercelCron
    })

    const collector = new PerformanceCollector()
    await collector.collectAllUsersSummaries()

    return NextResponse.json({
      success: true,
      message: 'Daily performance collection completed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Performance collection error:', error)
    return NextResponse.json(
      { error: 'Failed to collect performance data', details: error },
      { status: 500 }
    )
  }
}

