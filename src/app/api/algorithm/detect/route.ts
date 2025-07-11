import { NextRequest, NextResponse } from 'next/server'
import { AnomalyDetector } from '@/lib/algorithm/anomaly-detector'

// POST /api/algorithm/detect - Run anomaly detection (protected endpoint)
export async function POST(request: NextRequest) {
  try {
    // This endpoint should be protected - only allow from cron jobs
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting algorithm detection...')

    // Run detection on aggregated daily data
    const detector = new AnomalyDetector()
    const changes = await detector.detectChanges()

    console.log(`Detection complete. Found ${changes.length} changes`)

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

  } catch (error) {
    console.error('Algorithm detection error:', error)
    return NextResponse.json(
      { error: 'Failed to run detection' },
      { status: 500 }
    )
  }
}

// GET /api/algorithm/detect - Manual trigger for testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const testMode = url.searchParams.get('test') === 'true'
  
  if (!testMode) {
    return NextResponse.json({ error: 'This endpoint is for scheduled jobs only' }, { status: 403 })
  }

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