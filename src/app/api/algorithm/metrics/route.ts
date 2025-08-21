import { NextRequest, NextResponse } from 'next/server'
import { PerformanceCollector } from '@/lib/algorithm/performance-collector'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { AlgorithmMetricsQuerySchema, AlgorithmMetricsPostSchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic'

export const POST = withSecurityHeaders(
  withAuthAndValidation({
    body: AlgorithmMetricsPostSchema
  })(async (request: NextRequest, userId: string, { validatedBody }) => {
    try {
      const collector = new PerformanceCollector()
      const summary = await collector.collectDailySummary(userId)

      if (!summary) {
        return NextResponse.json({ error: 'No recent posts to analyze' }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        summary,
        timestamp: new Date().toISOString(),
        config: validatedBody || {}
      })

    } catch (error) {
      console.error('Error collecting metrics:', error)
      return NextResponse.json(
        { error: 'Failed to collect metrics' },
        { status: 500 }
      )
    }
  })
)

export const GET = withSecurityHeaders(
  withAuthAndValidation({
    query: AlgorithmMetricsQuerySchema
  })(async (request: NextRequest, userId: string, { validatedQuery }) => {
    try {
      const collector = new PerformanceCollector()
      const days = validatedQuery?.days || 7
      const includeDetails = validatedQuery?.include_details || false
      
      const trend = await collector.getUserTrend(userId)

      return NextResponse.json({
        success: true,
        trend,
        user_id: userId,
        timeframe_days: days,
        include_details: includeDetails
      })

    } catch (error) {
      console.error('Error fetching metrics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      )
    }
  })
)