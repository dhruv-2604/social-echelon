/**
 * Send Outreach Email API
 *
 * POST /api/outreach/send
 * Sends a brand partnership email with one click
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { getEmailOutreachService } from '@/lib/outreach/email-service'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const SendOutreachSchema = z.object({
  matchId: z.string().uuid(),
  subject: z.string().min(5).max(200),
  body: z.string().min(50).max(5000)
})

export const POST = withSecurityHeaders(
  withAuthAndValidation({
    body: SendOutreachSchema
  })(async (request: NextRequest, userId: string, { validatedBody }) => {
    try {
      const supabase = getSupabaseAdmin()
      const { matchId, subject, body } = validatedBody!

      // Get match details with brand info
      const { data: match, error: matchError } = await supabase
        .from('user_brand_matches')
        .select(`
          id,
          brand_id,
          outreach_sent,
          brands (
            id,
            name,
            pr_email,
            email_verified
          )
        `)
        .eq('id', matchId)
        .eq('user_id', userId)
        .single()

      if (matchError || !match) {
        return NextResponse.json(
          { error: 'Match not found' },
          { status: 404 }
        )
      }

      // Check if already sent
      if ((match as any).outreach_sent) {
        return NextResponse.json(
          { error: 'Outreach already sent for this match' },
          { status: 400 }
        )
      }

      const brand = (match as any).brands
      if (!brand?.pr_email) {
        return NextResponse.json(
          { error: 'Brand does not have a contact email' },
          { status: 400 }
        )
      }

      // Get creator's email for reply-to
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single()

      const creatorEmail = (profile as any)?.email || ''

      // Send the email
      const emailService = getEmailOutreachService()
      const result = await emailService.sendBrandOutreach({
        userId,
        brandId: brand.id,
        matchId,
        brandEmail: brand.pr_email,
        subject,
        body,
        creatorEmail
      })

      if (result.success) {
        return NextResponse.json({
          success: true,
          outreachId: result.outreachId,
          message: 'Email sent successfully'
        })
      } else {
        return NextResponse.json(
          { error: result.error || 'Failed to send email' },
          { status: 500 }
        )
      }

    } catch (error) {
      console.error('Send outreach error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)
