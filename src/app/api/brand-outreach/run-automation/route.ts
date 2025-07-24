import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { OutreachAutomationService } from '@/lib/brand-discovery/outreach-automation'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const automationService = new OutreachAutomationService()

    // Create personalized campaigns for new creators
    await automationService.createPersonalizedCampaigns()

    // Schedule daily outreach
    await automationService.scheduleDailyOutreach()

    // Process any scheduled outreach that's due
    await automationService.processScheduledOutreach()

    // Check for and process responses
    await automationService.processResponses()

    return NextResponse.json({
      success: true,
      message: 'Automation cycle completed successfully'
    })

  } catch (error) {
    console.error('Error running automation:', error)
    return NextResponse.json(
      { error: 'Failed to run automation' },
      { status: 500 }
    )
  }
}