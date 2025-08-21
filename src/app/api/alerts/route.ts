import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { z } from 'zod'
import { AlertManager } from '@/lib/algorithm/alert-manager'

export const dynamic = 'force-dynamic'

// Query parameters validation for GET request
const AlertsQuerySchema = z.object({
  unread: z.enum(['true', 'false']).optional()
})

// GET /api/alerts - Get user's alerts
export const GET = withSecurityHeaders(
  withAuthAndValidation({
    query: AlertsQuerySchema
  })(async (request: NextRequest, userId: string, { validatedQuery }) => {
    try {
      const unreadOnly = validatedQuery?.unread === 'true'
      
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
  })
)

// Body validation for PATCH request
const MarkAlertsReadSchema = z.object({
  alertIds: z.array(z.string().uuid()).min(1).max(100)
})

// PATCH /api/alerts - Mark alerts as read
export const PATCH = withSecurityHeaders(
  withAuthAndValidation({
    body: MarkAlertsReadSchema
  })(async (request: NextRequest, userId: string, { validatedBody }) => {
    try {
      if (!validatedBody) {
        return NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        )
      }
      
      const alertManager = new AlertManager()
      await alertManager.markAlertsAsRead(validatedBody.alertIds)
      
      return NextResponse.json({
        success: true,
        updated: validatedBody.alertIds.length
      })
    } catch (error) {
      console.error('Error updating alerts:', error)
      return NextResponse.json(
        { error: 'Failed to update alerts' },
        { status: 500 }
      )
    }
  })
)