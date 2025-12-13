/**
 * Admin Enrichment API
 *
 * GET /api/admin/enrichment - Get enrichment stats
 * POST /api/admin/enrichment - Run enrichment pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { getAutoEnrichmentService } from '@/lib/brand-matching/auto-enrichment-service'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET: Enrichment stats
export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      // Check admin role
      const supabase = getSupabaseAdmin()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if ((profile as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }

      const service = getAutoEnrichmentService()
      const stats = await service.getEnrichmentStats()

      return NextResponse.json({
        success: true,
        stats
      })
    } catch (error) {
      console.error('Get enrichment stats error:', error)
      return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
    }
  })
)

// POST: Run enrichment
export const POST = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      // Check admin role
      const supabase = getSupabaseAdmin()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if ((profile as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }

      const service = getAutoEnrichmentService()
      const result = await service.runEnrichment()

      return NextResponse.json({
        success: true,
        message: `Enrichment complete: ${result.emailsVerified} emails verified, ${result.confidenceUpdated} confidence updated`,
        result
      })
    } catch (error) {
      console.error('Run enrichment error:', error)
      return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
    }
  })
)
