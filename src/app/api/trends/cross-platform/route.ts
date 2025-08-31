import { NextRequest, NextResponse } from 'next/server'
import { CrossPlatformAnalyzer } from '@/lib/trends/cross-platform-analyzer'
import { withAuthAndValidation } from '@/lib/validation/middleware'

// GET cross-platform trend analysis
export const GET = withAuthAndValidation({})(
  async (request: NextRequest, userId: string) => {
    try {
      const { searchParams } = new URL(request.url)
      const niche = searchParams.get('niche') || undefined
      const limit = parseInt(searchParams.get('limit') || '20')
      
      // Get cross-platform trends
      const trends = await CrossPlatformAnalyzer.getCrossPlatformTrends(niche, limit)
      
      // Get alerts for high-priority trends
      const alerts = await CrossPlatformAnalyzer.getTrendAlerts()
      
      // Get predictions for Instagram from Twitter
      const predictions = await CrossPlatformAnalyzer.predictInstagramFromTwitter()
      
      return NextResponse.json({
        success: true,
        trends,
        alerts: alerts.filter(a => a.urgency === 'HIGH'),
        predictions: predictions.slice(0, 5),
        generated_at: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('Cross-platform analysis error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to analyze cross-platform trends' },
        { status: 500 }
      )
    }
  }
)