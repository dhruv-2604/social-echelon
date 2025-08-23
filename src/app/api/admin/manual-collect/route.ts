import { NextRequest, NextResponse } from 'next/server'
import { PerformanceCollector } from '@/lib/algorithm/performance-collector'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Helper to verify admin role
async function verifyAdminRole(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  return profile?.role === 'admin'
}

// Optional query parameters for manual collection
const ManualCollectQuerySchema = z.object({
  user_only: z.enum(['true', 'false']).optional()
})

// GET - Manual trigger for single user data collection (admin-only)
export const GET = withSecurityHeaders(
  withAuthAndValidation({
    query: ManualCollectQuerySchema
  })(async (request: NextRequest, userId: string, { validatedQuery }) => {
    try {
      // Verify admin role
      if (!await verifyAdminRole(userId)) {
        return NextResponse.json({ 
          error: 'Admin access required for manual data collection' 
        }, { status: 403 })
      }

      // Restrict in production unless explicitly enabled
      if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_MANUAL_COLLECTION) {
        return NextResponse.json({ 
          error: 'Manual collection disabled in production' 
        }, { status: 403 })
      }

      const supabase = getSupabaseAdmin()
      
      // For user-only mode, collect just for the admin user
      const targetUserId = validatedQuery?.user_only === 'true' ? userId : userId
      
      const collector = new PerformanceCollector()
      const summary = await collector.collectDailySummary(targetUserId)
      
      if (!summary) {
        return NextResponse.json({ 
          error: 'Failed to collect data',
          note: 'Check if Instagram token is valid and posts exist'
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        message: 'Manual collection completed',
        collected_for: targetUserId,
        timestamp: new Date().toISOString()
        // Don't expose sensitive data in response
      })
      
    } catch (error) {
      console.error('Manual collection error:', error)
      return NextResponse.json(
        { error: 'Manual collection failed' },
        { status: 500 }
      )
    }
  })
)

// POST - Collect for ALL users (admin function)
export const POST = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      // Verify admin role - critical for this endpoint
      if (!await verifyAdminRole(userId)) {
        return NextResponse.json({ 
          error: 'Admin access required for bulk data collection' 
        }, { status: 403 })
      }

      // Extra protection - this is a powerful operation
      if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_BULK_COLLECTION) {
        return NextResponse.json({ 
          error: 'Bulk collection disabled in production' 
        }, { status: 403 })
      }
      
      const collector = new PerformanceCollector()
      await collector.collectAllUsersSummaries()
      
      return NextResponse.json({
        success: true,
        message: 'Bulk collection for all users completed',
        timestamp: new Date().toISOString()
        // Don't expose who initiated it for security
      })
      
    } catch (error) {
      console.error('Bulk collection error:', error)
      return NextResponse.json(
        { error: 'Bulk collection failed' },
        { status: 500 }
      )
    }
  })
)