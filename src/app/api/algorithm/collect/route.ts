import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { PerformanceCollector } from '@/lib/algorithm/performance-collector'

// GET /api/algorithm/collect - Daily performance collection (runs once per day)
// Vercel crons call GET endpoints, not POST
export async function GET(request: NextRequest) {
  console.log('==========================================')
  console.log('COLLECT ENDPOINT HIT AT:', new Date().toISOString())
  console.log('All headers:', Object.fromEntries(request.headers.entries()))
  console.log('==========================================')
  
  try {
    // Check if this is a Vercel cron job request
    // Vercel sets a special header for cron jobs
    const authHeader = request.headers.get('authorization')
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    
    // Verify this is either a Vercel cron job or has proper authorization
    if (!isVercelCron && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('Unauthorized access attempt - not a Vercel cron and invalid auth')
      return NextResponse.json({ error: 'This endpoint is for scheduled jobs only' }, { status: 403 })
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

