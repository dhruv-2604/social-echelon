/**
 * Email Tracking API
 *
 * GET /api/outreach/track?id=xxx&type=open
 * Tracks email opens via 1x1 pixel
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEmailOutreachService } from '@/lib/outreach/email-service'

export const dynamic = 'force-dynamic'

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const outreachId = searchParams.get('id')
  const trackType = searchParams.get('type')

  if (outreachId && trackType === 'open') {
    try {
      const emailService = getEmailOutreachService()
      await emailService.markAsOpened(outreachId)
    } catch (error) {
      console.error('Tracking error:', error)
    }
  }

  // Return 1x1 transparent GIF
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}
