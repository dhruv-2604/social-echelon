/**
 * Admin Brand Requests API
 *
 * GET /api/admin/brand-requests - List pending brand requests
 * PATCH /api/admin/brand-requests - Process a request (add/reject)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ProcessRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['add', 'reject']),
  brandData: z.object({
    name: z.string(),
    industry: z.string(),
    website: z.string().optional(),
    instagram_handle: z.string().optional(),
    pr_email: z.string().email().optional()
  }).optional(),
  rejectionReason: z.string().optional()
})

// GET: List pending requests
export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      const supabase = getSupabaseAdmin()

      // Check admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if ((profile as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }

      // Get pending requests sorted by request count (most requested first)
      const { data: requests, error } = await supabase
        .from('brand_requests')
        .select(`
          id,
          brand_name,
          source,
          status,
          request_count,
          first_requested_at,
          last_requested_at,
          notes,
          profiles:requested_by (
            full_name,
            instagram_username
          )
        `)
        .eq('status', 'pending')
        .order('request_count', { ascending: false })
        .limit(50)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        requests: requests || []
      })
    } catch (error) {
      console.error('Get brand requests error:', error)
      return NextResponse.json({ error: 'Failed to get requests' }, { status: 500 })
    }
  })
)

// PATCH: Process a request
export const PATCH = withSecurityHeaders(
  withAuthAndValidation({
    body: ProcessRequestSchema
  })(async (request: NextRequest, userId: string, { validatedBody }) => {
    try {
      const supabase = getSupabaseAdmin()

      // Check admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if ((profile as any)?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }

      const { requestId, action, brandData, rejectionReason } = validatedBody!

      if (action === 'add') {
        if (!brandData) {
          return NextResponse.json({ error: 'Brand data required for add action' }, { status: 400 })
        }

        // Create the brand
        const { data: newBrand, error: brandError } = await supabase
          .from('brands')
          .insert({
            name: brandData.name,
            industry: brandData.industry,
            website: brandData.website,
            instagram_handle: brandData.instagram_handle,
            pr_email: brandData.pr_email,
            email_verified: false,
            hiring_confidence: 50,
            data_confidence: 70, // Fresh data
            last_researched_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (brandError) {
          return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 })
        }

        // Update the request
        await supabase
          .from('brand_requests')
          .update({
            status: 'added',
            processed_at: new Date().toISOString(),
            processed_by: userId,
            brand_id: (newBrand as any).id
          })
          .eq('id', requestId)

        // Notify creator(s) who requested this brand
        // TODO: Add notification system

        return NextResponse.json({
          success: true,
          message: `Brand "${brandData.name}" added successfully`,
          brandId: (newBrand as any).id
        })

      } else if (action === 'reject') {
        await supabase
          .from('brand_requests')
          .update({
            status: 'rejected',
            processed_at: new Date().toISOString(),
            processed_by: userId,
            rejection_reason: rejectionReason || 'Not a suitable brand for creator partnerships'
          })
          .eq('id', requestId)

        return NextResponse.json({
          success: true,
          message: 'Request rejected'
        })
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
      console.error('Process brand request error:', error)
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
    }
  })
)
