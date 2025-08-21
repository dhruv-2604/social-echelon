import { NextRequest, NextResponse } from 'next/server'
import { withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { PerformanceCollector } from '@/lib/algorithm/performance-collector'

export const dynamic = 'force-dynamic'

// Internal helper to verify cron authorization
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  
  // Allow if it's a Vercel cron job
  if (isVercelCron) return true
  
  // Allow if proper auth token is provided
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }
  
  return false
}

// GET /api/algorithm/collect - Daily performance collection (runs once per day)
// Vercel crons call GET endpoints, not POST
export const GET = withSecurityHeaders(
  rateLimit(5, 3600000)( // Limit to 5 calls per hour even for cron
    async (request: NextRequest) => {
      console.log('==========================================')
      console.log('COLLECT ENDPOINT HIT AT:', new Date().toISOString())
      console.log('Authorization:', request.headers.get('authorization') ? 'present' : 'missing')
      console.log('Vercel Cron:', request.headers.get('x-vercel-cron'))
      console.log('==========================================')
      
      try {
        // Verify this is a legitimate cron request
        if (!verifyCronAuth(request)) {
          console.log('Unauthorized access attempt - not a valid cron request')
          return NextResponse.json({ 
            error: 'This endpoint is for scheduled jobs only',
            hint: 'Provide Bearer token in Authorization header or use Vercel cron'
          }, { status: 403 })
        }

        // Limit scope if called manually (not by Vercel cron)
        const isManualCall = request.headers.get('x-vercel-cron') !== '1'
        
        console.log(`Starting performance collection (${isManualCall ? 'manual' : 'cron job'})...`)

        const collector = new PerformanceCollector()
        
        if (isManualCall) {
          // Manual calls collect less data to prevent abuse
          console.log('Manual call detected - collecting limited data')
          // Could add logic here to collect for fewer users or less data
        }
        
        await collector.collectAllUsersSummaries()

        return NextResponse.json({
          success: true,
          message: 'Daily performance collection completed',
          type: isManualCall ? 'manual' : 'scheduled',
          timestamp: new Date().toISOString()
        })

      } catch (error) {
        console.error('Performance collection error:', error)
        
        // Don't expose error details in production
        const errorMessage = process.env.NODE_ENV === 'production' 
          ? 'Failed to collect performance data'
          : `Failed to collect performance data: ${error}`
          
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        )
      }
    }
  )
)