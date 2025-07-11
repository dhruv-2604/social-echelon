import { NextRequest, NextResponse } from 'next/server'
import { PerformanceCollector } from '@/lib/algorithm/performance-collector'
import { cookies } from 'next/headers'

// POST /api/algorithm/metrics - Collect daily summary for current user
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const collector = new PerformanceCollector()
    const summary = await collector.collectDailySummary(userId)

    if (!summary) {
      return NextResponse.json({ error: 'No recent posts to analyze' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error collecting metrics:', error)
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    )
  }
}

// GET /api/algorithm/metrics - Get user's performance trend
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const collector = new PerformanceCollector()
    const trend = await collector.getUserTrend(userId)

    return NextResponse.json({
      success: true,
      trend,
      user_id: userId
    })

  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}