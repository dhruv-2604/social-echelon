import { NextRequest, NextResponse } from 'next/server'
import { PerformanceCollector } from '@/lib/algorithm/performance-collector'

// POST /api/algorithm/collect - Daily performance collection (runs once per day)
export async function POST(request: NextRequest) {
  try {
    // Protected endpoint - only allow from cron jobs
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting daily performance collection...')

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
      { error: 'Failed to collect performance data' },
      { status: 500 }
    )
  }
}

// GET /api/algorithm/collect?test=true - Manual trigger for testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const testMode = url.searchParams.get('test') === 'true'
  
  if (!testMode) {
    return NextResponse.json({ error: 'This endpoint is for scheduled jobs only' }, { status: 403 })
  }

  // For testing, collect data for the current user
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const collector = new SimplePerformanceCollector()
  const summary = await collector.collectDailySummary(userId)

  if (!summary) {
    return NextResponse.json({ error: 'Failed to collect data' }, { status: 500 })
  }

  // Also get trend
  const trend = await collector.getUserTrend(userId)

  return NextResponse.json({
    success: true,
    summary,
    trend,
    message: 'Test collection completed'
  })
}