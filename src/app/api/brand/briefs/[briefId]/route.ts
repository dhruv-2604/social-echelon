import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import { z } from 'zod'

// Update brief validation schema
const UpdateBriefSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  campaign_type: z.array(z.enum(['post', 'story', 'reel', 'ugc', 'review', 'unboxing'])).optional(),
  product_name: z.string().max(200).optional().nullable(),
  product_description: z.string().max(2000).optional().nullable(),
  product_url: z.string().url().optional().or(z.literal('')).nullable(),
  target_niches: z.array(z.string()).optional(),
  target_locations: z.array(z.string()).optional(),
  target_audience_age: z.array(z.string()).optional(),
  min_followers: z.number().int().min(0).optional().nullable(),
  max_followers: z.number().int().min(0).optional().nullable(),
  min_engagement_rate: z.number().min(0).max(100).optional().nullable(),
  budget_min: z.number().int().min(0).optional().nullable(),
  budget_max: z.number().int().min(0).optional().nullable(),
  deadline: z.string().optional().nullable(),
  content_deadline: z.string().optional().nullable(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional()
})

// Helper to verify brief ownership
async function verifyBriefOwnership(supabase: any, briefId: string, userId: string) {
  const { data, error } = await supabase
    .from('campaign_briefs')
    .select('id, brand_user_id')
    .eq('id', briefId)
    .single()

  if (error || !data) {
    return { exists: false, owned: false }
  }

  return { exists: true, owned: data.brand_user_id === userId }
}

// GET - Get a specific brief with responses
export const GET = withSecurityHeaders(
  requireUserType('brand')(
    async (request: NextRequest, userId: string, userType: string, context: { params: Promise<{ briefId: string }> }) => {
      try {
        const params = await context.params
        const { briefId } = params
        const supabaseAdmin = getSupabaseAdmin()

        // Verify ownership
        const ownership = await verifyBriefOwnership(supabaseAdmin, briefId, userId)
        if (!ownership.exists) {
          return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
        }
        if (!ownership.owned) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Fetch the brief
        const { data: brief, error: briefError } = await supabaseAdmin
          .from('campaign_briefs')
          .select('*')
          .eq('id', briefId)
          .single()

        if (briefError) {
          console.error('Error fetching brief:', briefError)
          return NextResponse.json({ error: 'Failed to fetch brief' }, { status: 500 })
        }

        // Fetch responses/matches with creator info
        const { data: matches, error: matchError } = await supabaseAdmin
          .from('brief_matches')
          .select(`
            id,
            match_score,
            match_reasons,
            creator_response,
            response_at,
            decline_reason,
            partnership_status,
            created_at,
            profiles:creator_user_id (
              id,
              full_name,
              instagram_username,
              follower_count,
              engagement_rate,
              niche,
              profile_picture_url
            )
          `)
          .eq('brief_id', briefId)
          .order('match_score', { ascending: false })

        if (matchError) {
          console.error('Error fetching matches:', matchError)
        }

        return NextResponse.json({
          brief,
          matches: matches || []
        })

      } catch (error) {
        console.error('Brief fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch brief' }, { status: 500 })
      }
    }
  )
)

// PATCH - Update a brief
export const PATCH = withSecurityHeaders(
  requireUserType('brand')(
    async (request: NextRequest, userId: string, userType: string, context: { params: Promise<{ briefId: string }> }) => {
      try {
        const params = await context.params
        const { briefId } = params
        const body = await request.json()
        const supabaseAdmin = getSupabaseAdmin()

        // Verify ownership
        const ownership = await verifyBriefOwnership(supabaseAdmin, briefId, userId)
        if (!ownership.exists) {
          return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
        }
        if (!ownership.owned) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Validate update data
        const validation = UpdateBriefSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json(
            {
              error: 'Invalid update data',
              details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            },
            { status: 400 }
          )
        }

        const updateData = {
          ...validation.data,
          updated_at: new Date().toISOString()
        }

        const { data: brief, error } = await supabaseAdmin
          .from('campaign_briefs')
          .update(updateData)
          .eq('id', briefId)
          .select()
          .single()

        if (error) {
          console.error('Error updating brief:', error)
          return NextResponse.json({ error: 'Failed to update brief' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          brief,
          message: 'Brief updated successfully'
        })

      } catch (error) {
        console.error('Brief update error:', error)
        return NextResponse.json({ error: 'Failed to update brief' }, { status: 500 })
      }
    }
  )
)

// DELETE - Delete a brief (soft delete by setting status to cancelled)
export const DELETE = withSecurityHeaders(
  requireUserType('brand')(
    async (request: NextRequest, userId: string, userType: string, context: { params: Promise<{ briefId: string }> }) => {
      try {
        const params = await context.params
        const { briefId } = params
        const supabaseAdmin = getSupabaseAdmin()

        // Verify ownership
        const ownership = await verifyBriefOwnership(supabaseAdmin, briefId, userId)
        if (!ownership.exists) {
          return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
        }
        if (!ownership.owned) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Soft delete by setting status to cancelled
        const { error } = await supabaseAdmin
          .from('campaign_briefs')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', briefId)

        if (error) {
          console.error('Error deleting brief:', error)
          return NextResponse.json({ error: 'Failed to delete brief' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Brief cancelled successfully'
        })

      } catch (error) {
        console.error('Brief delete error:', error)
        return NextResponse.json({ error: 'Failed to delete brief' }, { status: 500 })
      }
    }
  )
)
