import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'

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

// GET - Test cron functionality (admin or cron only)
export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      // Verify authorization
      const { authorized, source } = await verifyAdminOrCron(request, userId)
      if (!authorized) {
        return NextResponse.json({ 
          error: 'Admin access or cron authorization required for testing' 
        }, { status: 403 })
      }

      // Restrict in production unless explicitly enabled
      if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_CRON_TESTING) {
        return NextResponse.json({ 
          error: 'Cron testing disabled in production environment' 
        }, { status: 403 })
      }

      const supabase = getSupabaseAdmin()
      const timestamp = new Date().toISOString()
      
      // Log this test run (without exposing headers)
      const { error } = await supabase
        .from('job_queue')
        .insert({
          type: 'cron_test',
          status: 'completed',
          data: { 
            message: 'Cron test successful',
            timestamp,
            authorized_by: source,
            user_agent: request.headers.get('user-agent')?.substring(0, 100)
          },
          completed_at: timestamp
        })
      
      if (error) {
        console.error('Error logging test:', error)
      }
      
      return NextResponse.json({
        success: true,
        message: 'Cron test endpoint working',
        timestamp,
        authorized_by: source,
        environment: process.env.NODE_ENV || 'development',
        note: 'Test entry logged in job_queue table'
      })
      
    } catch (error) {
      console.error('Cron test error:', error)
      return NextResponse.json(
        { error: 'Cron test failed' },
        { status: 500 }
      )
    }
  })
)