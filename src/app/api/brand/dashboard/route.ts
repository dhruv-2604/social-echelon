import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'

export const GET = withSecurityHeaders(
  requireUserType('brand')(
    async (request: NextRequest, userId: string) => {
      try {
        const supabaseAdmin = getSupabaseAdmin()

        // Fetch brand profile
        const { data: brandProfile, error: profileError } = await supabaseAdmin
          .from('brand_profiles')
          .select('company_name, industry, onboarding_completed')
          .eq('user_id', userId)
          .single()

        if (profileError) {
          console.error('Error fetching brand profile:', profileError)
          return NextResponse.json(
            { error: 'Failed to fetch brand profile' },
            { status: 500 }
          )
        }

        // Count active briefs
        const { count: activeBriefs, error: briefsError } = await supabaseAdmin
          .from('campaign_briefs')
          .select('*', { count: 'exact', head: true })
          .eq('brand_user_id', userId)
          .eq('status', 'active')

        if (briefsError) {
          console.error('Error counting briefs:', briefsError)
        }

        // Count total responses (creators who said yes to any of our briefs)
        const { count: totalResponses, error: responsesError } = await supabaseAdmin
          .from('brief_matches')
          .select(`
            id,
            campaign_briefs!inner(brand_user_id)
          `, { count: 'exact', head: true })
          .eq('campaign_briefs.brand_user_id', userId)
          .eq('creator_response', 'yes')

        if (responsesError) {
          console.error('Error counting responses:', responsesError)
        }

        // Count active partnerships
        const { count: activePartnerships, error: partnershipsError } = await supabaseAdmin
          .from('partnerships')
          .select('*', { count: 'exact', head: true })
          .eq('brand_user_id', userId)
          .eq('status', 'active')

        if (partnershipsError) {
          console.error('Error counting partnerships:', partnershipsError)
        }

        // Count unread messages in threads where brand is a participant
        const { count: pendingMessages, error: messagesError } = await supabaseAdmin
          .from('messages')
          .select(`
            id,
            message_threads!inner(brand_user_id)
          `, { count: 'exact', head: true })
          .eq('message_threads.brand_user_id', userId)
          .neq('sender_id', userId)
          .eq('read', false)

        if (messagesError) {
          console.error('Error counting messages:', messagesError)
        }

        return NextResponse.json({
          brandProfile,
          stats: {
            activeBriefs: activeBriefs || 0,
            totalResponses: totalResponses || 0,
            activePartnerships: activePartnerships || 0,
            pendingMessages: pendingMessages || 0
          }
        })

      } catch (error) {
        console.error('Brand dashboard error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch dashboard data' },
          { status: 500 }
        )
      }
    }
  )
)
