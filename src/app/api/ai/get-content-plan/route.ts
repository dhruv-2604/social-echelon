import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET user's content plan with rate limiting
export const GET = withSecurityHeaders(
  rateLimit(10, 60000)( // 10 requests per minute
    withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
      try {
        const supabaseAdmin = getSupabaseAdmin()

        // Parse and validate week_offset query parameter
        const url = new URL(request.url)
        const weekOffsetParam = url.searchParams.get('week_offset')
        let weekOffset = 0
        
        if (weekOffsetParam) {
          const parsed = parseInt(weekOffsetParam)
          if (!isNaN(parsed) && parsed >= -52 && parsed <= 52) {
            weekOffset = parsed
          }
        }

        // Get the target week's Monday
        const now = new Date()
        
        const dayOfWeek = now.getDay()
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const thisMonday = new Date(now)
        thisMonday.setDate(now.getDate() + daysToMonday + (weekOffset * 7))
        thisMonday.setHours(0, 0, 0, 0)
        
        const weekStarting = thisMonday.toISOString().split('T')[0]

        // Get the content plan for this user and week
        const { data: contentPlans, error } = await supabaseAdmin
          .from('content_plans')
          .select('user_id, week_starting, suggestions, overall_strategy, generated_at, created_at')
          .eq('user_id', userId)
          .eq('week_starting', weekStarting)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error fetching content plan:', error)
          return NextResponse.json({ error: 'Failed to fetch content plan' }, { status: 500 })
        }

        if (contentPlans && contentPlans.length > 0) {
          const plan = contentPlans[0]
          return NextResponse.json({
            success: true,
            content_plan: {
              week_starting: plan.week_starting,
              suggestions: plan.suggestions || [],
              overall_strategy: plan.overall_strategy,
              generated_at: plan.generated_at
              // Don't expose user_id or internal timestamps
            }
          })
        }

        // No plan found for this week
        return NextResponse.json({
          success: false,
          message: 'No content plan found for this week',
          week_starting: weekStarting
        })

      } catch (error) {
        console.error('Error in get-content-plan:', error)
        return NextResponse.json(
          { error: 'Failed to retrieve content plan' },
          { status: 500 }
        )
      }
    })
  )
)