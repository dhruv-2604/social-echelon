import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the current week's Monday
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Sunday = 0, Monday = 1
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() + daysToMonday)
    thisMonday.setHours(0, 0, 0, 0)
    
    const weekStarting = thisMonday.toISOString().split('T')[0]

    console.log('Looking for content plan for week starting:', weekStarting)

    // Get the most recent content plan for this user
    const { data: contentPlans, error } = await supabaseAdmin
      .from('content_plans')
      .select('*')
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
      console.log('Found existing content plan:', plan.id, 'with', plan.suggestions?.length || 0, 'suggestions')
      return NextResponse.json({
        success: true,
        content_plan: {
          user_id: plan.user_id,
          week_starting: plan.week_starting,
          suggestions: plan.suggestions,
          overall_strategy: plan.overall_strategy,
          generated_at: plan.generated_at
        }
      })
    }

    // No plan found for this week
    console.log('No content plan found for this week')
    return NextResponse.json({
      success: false,
      message: 'No content plan found for this week'
    })

  } catch (error) {
    console.error('Error in get-content-plan:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}