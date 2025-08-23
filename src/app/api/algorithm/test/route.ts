import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Helper to verify admin role or cron access
async function verifyAdminOrCron(request: NextRequest, userId?: string): Promise<{ authorized: boolean; source: string }> {
  // Check for cron authorization first
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  
  if (isVercelCron || (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`)) {
    return { authorized: true, source: 'cron' }
  }
  
  // Check admin role
  if (!userId) {
    return { authorized: false, source: 'none' }
  }
  
  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  return { 
    authorized: profile?.role === 'admin', 
    source: profile?.role === 'admin' ? 'admin' : 'user' 
  }
}

// Validation schema for test actions
const TestActionSchema = z.object({
  action: z.enum(['simulate_reach_drop', 'simulate_format_preference', 'generate_realistic_data', 'cleanup_test_data']),
  params: z.object({
    niches: z.array(z.string()).optional(),
    percentDrop: z.number().min(1).max(100).optional(),
    affectedUsers: z.number().min(1).max(1000).optional(),
    format: z.enum(['reel', 'carousel', 'post']).optional(),
    boost: z.number().min(1).max(200).optional(),
    days: z.number().min(1).max(365).optional(),
    daysToKeep: z.number().min(1).max(90).optional()
  }).optional()
})

// POST - Run algorithm test action (admin or cron only)
export const POST = withSecurityHeaders(
  withAuthAndValidation({
    body: TestActionSchema
  })(async (request: NextRequest, userId: string, { validatedBody }) => {
    try {
      // Restrict in production unless explicitly enabled
      if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_ALGORITHM_TESTING) {
        return NextResponse.json({ 
          error: 'Algorithm testing disabled in production' 
        }, { status: 403 })
      }

      // Verify authorization
      const { authorized, source } = await verifyAdminOrCron(request, userId)
      if (!authorized) {
        return NextResponse.json({ 
          error: 'Admin access or cron authorization required' 
        }, { status: 403 })
      }

      const { action, params = {} } = validatedBody!
      
      // Import test utilities dynamically to avoid loading in production
      const { AlgorithmTestUtilities } = await import('@/lib/algorithm/test-utilities')
      
      switch (action) {
        case 'simulate_reach_drop':
          await AlgorithmTestUtilities.simulateReachDrop(
            params.niches || ['fashion', 'lifestyle'],
            params.percentDrop || 25,
            params.affectedUsers || 35
          )
          return NextResponse.json({
            success: true,
            message: 'Simulated reach drop successfully',
            authorized_by: source
          })
          
        case 'simulate_format_preference':
          await AlgorithmTestUtilities.simulateFormatPreference(
            params.format || 'reel',
            params.boost || 40
          )
          return NextResponse.json({
            success: true,
            message: 'Simulated format preference successfully',
            authorized_by: source
          })
          
        case 'generate_realistic_data':
          await AlgorithmTestUtilities.generateRealisticData(params.days || 14)
          return NextResponse.json({
            success: true,
            message: 'Generated realistic data successfully',
            authorized_by: source
          })
          
        case 'cleanup_test_data':
          await AlgorithmTestUtilities.cleanupTestData(params.daysToKeep || 7)
          return NextResponse.json({
            success: true,
            message: 'Cleaned up test data successfully',
            authorized_by: source
          })
          
        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          )
      }
    } catch (error) {
      console.error('Test utility error:', error)
      return NextResponse.json(
        { error: 'Failed to run test action' },
        { status: 500 }
      )
    }
  })
)

// GET - Show available test actions (admin only)
export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      // Verify admin access
      const { authorized } = await verifyAdminOrCron(request, userId)
      if (!authorized) {
        return NextResponse.json({ 
          error: 'Admin access required' 
        }, { status: 403 })
      }

      return NextResponse.json({
        available_actions: [
          {
            action: 'simulate_reach_drop',
            description: 'Simulate a platform-wide reach drop',
            required_params: [],
            optional_params: ['niches', 'percentDrop', 'affectedUsers']
          },
          {
            action: 'simulate_format_preference', 
            description: 'Simulate Instagram preferring a specific content format',
            required_params: [],
            optional_params: ['format', 'boost']
          },
          {
            action: 'generate_realistic_data',
            description: 'Generate realistic performance data for testing',
            required_params: [],
            optional_params: ['days']
          },
          {
            action: 'cleanup_test_data',
            description: 'Clean up old test data',
            required_params: [],
            optional_params: ['daysToKeep']
          }
        ],
        note: 'This endpoint is for testing purposes only and should not be used in production'
      })

    } catch (error) {
      console.error('Error fetching test actions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch test actions' },
        { status: 500 }
      )
    }
  })
)