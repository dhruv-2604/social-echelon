import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import { z } from 'zod'

// Campaign brief validation schema
const CreateBriefSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000, "Description too long"),
  campaign_type: z.array(z.enum(['post', 'story', 'reel', 'ugc', 'review', 'unboxing'])).min(1, "Select at least one campaign type"),
  product_name: z.string().max(200, "Product name too long").optional(),
  product_description: z.string().max(2000, "Product description too long").optional(),
  product_url: z.string().url("Invalid URL").optional().or(z.literal('')),
  target_niches: z.array(z.string()).optional(),
  target_locations: z.array(z.string()).optional(),
  target_audience_age: z.array(z.string()).optional(),
  min_followers: z.number().int().min(0).optional(),
  max_followers: z.number().int().min(0).optional(),
  min_engagement_rate: z.number().min(0).max(100).optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
  deadline: z.string().optional(),
  content_deadline: z.string().optional()
})

// GET - List all briefs for the brand
export const GET = withSecurityHeaders(
  requireUserType('brand')(
    async (request: NextRequest, userId: string) => {
      try {
        const supabaseAdmin = getSupabaseAdmin()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'all'

        let query = supabaseAdmin
          .from('campaign_briefs')
          .select(`
            id,
            title,
            description,
            campaign_type,
            product_name,
            budget_min,
            budget_max,
            deadline,
            status,
            created_at,
            updated_at
          `)
          .eq('brand_user_id', userId)
          .order('created_at', { ascending: false })

        if (status !== 'all') {
          query = query.eq('status', status)
        }

        const { data: briefs, error } = await query

        if (error) {
          console.error('Error fetching briefs:', error)
          return NextResponse.json(
            { error: 'Failed to fetch briefs' },
            { status: 500 }
          )
        }

        // Get response counts for each brief
        const briefIds = briefs?.map(b => b.id) || []
        const { data: matchCounts, error: matchError } = await supabaseAdmin
          .from('brief_matches')
          .select('brief_id, creator_response')
          .in('brief_id', briefIds.length > 0 ? briefIds : ['00000000-0000-0000-0000-000000000000'])

        if (matchError) {
          console.error('Error fetching match counts:', matchError)
        }

        // Aggregate response counts
        type MatchData = { brief_id: string; creator_response: string }
        const responseCounts = (matchCounts as MatchData[] || []).reduce((acc: Record<string, { total: number; yes: number; pending: number }>, match) => {
          const briefId = match.brief_id
          if (!acc[briefId]) {
            acc[briefId] = { total: 0, yes: 0, pending: 0 }
          }
          acc[briefId].total++
          if (match.creator_response === 'yes') {
            acc[briefId].yes++
          } else if (match.creator_response === 'pending') {
            acc[briefId].pending++
          }
          return acc
        }, {})

        // Attach counts to briefs
        type BriefData = { id: string; [key: string]: unknown }
        const briefsWithCounts = ((briefs || []) as BriefData[]).map(brief => ({
          ...brief,
          response_counts: responseCounts[brief.id] || { total: 0, yes: 0, pending: 0 }
        }))

        return NextResponse.json({ briefs: briefsWithCounts })

      } catch (error) {
        console.error('Briefs fetch error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch briefs' },
          { status: 500 }
        )
      }
    }
  )
)

// POST - Create a new brief
export const POST = withSecurityHeaders(
  requireUserType('brand')(
    async (request: NextRequest, userId: string) => {
      try {
        const body = await request.json()

        // Validate request body
        const validation = CreateBriefSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json(
            {
              error: 'Invalid brief data',
              details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            },
            { status: 400 }
          )
        }

        const briefData = validation.data
        const supabaseAdmin = getSupabaseAdmin()

        // Create the brief
        const { data: brief, error } = await supabaseAdmin
          .from('campaign_briefs')
          .insert({
            brand_user_id: userId,
            title: briefData.title,
            description: briefData.description,
            campaign_type: briefData.campaign_type,
            product_name: briefData.product_name || null,
            product_description: briefData.product_description || null,
            product_url: briefData.product_url || null,
            target_niches: briefData.target_niches || [],
            target_locations: briefData.target_locations || [],
            target_audience_age: briefData.target_audience_age || [],
            min_followers: briefData.min_followers || null,
            max_followers: briefData.max_followers || null,
            min_engagement_rate: briefData.min_engagement_rate || null,
            budget_min: briefData.budget_min || null,
            budget_max: briefData.budget_max || null,
            deadline: briefData.deadline || null,
            content_deadline: briefData.content_deadline || null,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating brief:', error)
          return NextResponse.json(
            { error: 'Failed to create brief' },
            { status: 500 }
          )
        }

        // TODO: Trigger AI matching engine here (Phase 3)
        // await matchBriefToCreators(brief.id)

        return NextResponse.json({
          success: true,
          brief,
          message: 'Campaign brief created successfully'
        }, { status: 201 })

      } catch (error) {
        console.error('Brief creation error:', error)
        return NextResponse.json(
          { error: 'Failed to create brief' },
          { status: 500 }
        )
      }
    }
  )
)
