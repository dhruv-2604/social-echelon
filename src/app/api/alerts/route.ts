import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
import { AlertManager } from '@/lib/algorithm/alert-manager'

// GET /api/alerts - Get user's alerts
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const unreadOnly = url.searchParams.get('unread') === 'true'
    
    const alertManager = new AlertManager()
    const alerts = await alertManager.getUserAlerts(userId, unreadOnly)
    
    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

// PATCH /api/alerts - Mark alerts as read
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertIds } = await request.json()
    
    if (!alertIds || !Array.isArray(alertIds)) {
      return NextResponse.json(
        { error: 'Invalid alert IDs' },
        { status: 400 }
      )
    }
    
    const alertManager = new AlertManager()
    await alertManager.markAlertsAsRead(alertIds)
    
    return NextResponse.json({
      success: true,
      updated: alertIds.length
    })
  } catch (error) {
    console.error('Error updating alerts:', error)
    return NextResponse.json(
      { error: 'Failed to update alerts' },
      { status: 500 }
    )
  }
}