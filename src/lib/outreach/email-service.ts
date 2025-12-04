/**
 * Email Outreach Service
 *
 * Sends brand partnership emails via Resend
 * Tracks opens, clicks, and responses
 *
 * Wellness mission: One click to send, we handle everything else
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'

interface SendEmailOptions {
  to: string
  subject: string
  body: string
  replyTo?: string
  trackingId?: string // For open/click tracking
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

interface OutreachRecord {
  id: string
  userId: string
  brandId: string
  matchId: string
  email: string
  subject: string
  body: string
  status: 'queued' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed'
  sentAt?: Date
  openedAt?: Date
  repliedAt?: Date
  followUpCount: number
  nextFollowUpAt?: Date
}

export class EmailOutreachService {
  private apiKey: string
  private fromEmail: string
  private fromName: string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || ''
    this.fromEmail = process.env.OUTREACH_FROM_EMAIL || 'outreach@socialechelon.co'
    this.fromName = process.env.OUTREACH_FROM_NAME || 'Social Echelon'
  }

  /**
   * Send a single outreach email
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey) {
      console.error('RESEND_API_KEY not configured')
      return { success: false, error: 'Email service not configured' }
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: this.formatEmailHtml(options.body, options.trackingId),
          reply_to: options.replyTo,
          headers: options.trackingId ? {
            'X-Tracking-Id': options.trackingId
          } : undefined
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Resend API error:', error)
        return { success: false, error }
      }

      const data = await response.json()
      return { success: true, messageId: data.id }

    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Queue and send outreach for a brand match
   * This is the main entry point for creators
   */
  async sendBrandOutreach(params: {
    userId: string
    brandId: string
    matchId: string
    brandEmail: string
    subject: string
    body: string
    creatorEmail: string
  }): Promise<{ success: boolean; outreachId?: string; error?: string }> {
    const supabase = getSupabaseAdmin()

    try {
      // Create outreach record first
      const { data: outreach, error: insertError } = await supabase
        .from('outreach_messages')
        .insert({
          user_id: params.userId,
          brand_id: params.brandId,
          match_id: params.matchId,
          to_email: params.brandEmail,
          subject: params.subject,
          body: params.body,
          status: 'queued',
          follow_up_count: 0,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (insertError || !outreach) {
        throw new Error(`Failed to create outreach record: ${insertError?.message}`)
      }

      const outreachId = (outreach as any).id

      // Send the email
      const result = await this.sendEmail({
        to: params.brandEmail,
        subject: params.subject,
        body: params.body,
        replyTo: params.creatorEmail,
        trackingId: outreachId
      })

      if (result.success) {
        // Update record with sent status
        await supabase
          .from('outreach_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            message_id: result.messageId,
            // Schedule first follow-up for 3 days
            next_follow_up_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', outreachId)

        // Increment brand's outreach count
        await supabase.rpc('increment_brand_outreach', { p_brand_id: params.brandId })

        // Update user_brand_matches
        await supabase
          .from('user_brand_matches')
          .update({
            outreach_sent: true,
            outreach_sent_at: new Date().toISOString()
          })
          .eq('id', params.matchId)

        return { success: true, outreachId }
      } else {
        // Mark as failed
        await supabase
          .from('outreach_messages')
          .update({
            status: 'failed',
            error_message: result.error
          })
          .eq('id', outreachId)

        return { success: false, error: result.error }
      }

    } catch (error) {
      console.error('Brand outreach error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get outreach history for a user
   */
  async getUserOutreachHistory(userId: string, limit = 50): Promise<OutreachRecord[]> {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('outreach_messages')
      .select(`
        id,
        brand_id,
        match_id,
        to_email,
        subject,
        status,
        sent_at,
        opened_at,
        replied_at,
        follow_up_count,
        next_follow_up_at,
        brands (name, instagram_handle)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching outreach history:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId,
      brandId: row.brand_id,
      matchId: row.match_id,
      email: row.to_email,
      subject: row.subject,
      body: '',
      status: row.status,
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      openedAt: row.opened_at ? new Date(row.opened_at) : undefined,
      repliedAt: row.replied_at ? new Date(row.replied_at) : undefined,
      followUpCount: row.follow_up_count,
      nextFollowUpAt: row.next_follow_up_at ? new Date(row.next_follow_up_at) : undefined,
      brandName: row.brands?.name,
      brandInstagram: row.brands?.instagram_handle
    }))
  }

  /**
   * Mark email as opened (called from tracking pixel/webhook)
   */
  async markAsOpened(outreachId: string): Promise<void> {
    const supabase = getSupabaseAdmin()

    await supabase
      .from('outreach_messages')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString()
      })
      .eq('id', outreachId)
      .eq('status', 'sent') // Only update if not already opened
  }

  /**
   * Mark email as replied (called when we detect a response)
   */
  async markAsReplied(outreachId: string, isPositive: boolean): Promise<void> {
    const supabase = getSupabaseAdmin()

    // Get the brand_id first
    const { data: outreach } = await supabase
      .from('outreach_messages')
      .select('brand_id')
      .eq('id', outreachId)
      .single()

    if (outreach) {
      // Update outreach record
      await supabase
        .from('outreach_messages')
        .update({
          status: 'replied',
          replied_at: new Date().toISOString(),
          next_follow_up_at: null // Cancel scheduled follow-ups
        })
        .eq('id', outreachId)

      // Increment brand's response count
      await supabase.rpc('increment_brand_responses', {
        p_brand_id: (outreach as any).brand_id,
        p_is_positive: isPositive
      })
    }
  }

  /**
   * Get outreach stats for dashboard
   */
  async getOutreachStats(userId: string): Promise<{
    totalSent: number
    opened: number
    replied: number
    pending: number
    openRate: number
    replyRate: number
  }> {
    const supabase = getSupabaseAdmin()

    const { data } = await supabase
      .from('outreach_messages')
      .select('status')
      .eq('user_id', userId)

    if (!data || data.length === 0) {
      return {
        totalSent: 0,
        opened: 0,
        replied: 0,
        pending: 0,
        openRate: 0,
        replyRate: 0
      }
    }

    const totalSent = data.filter((r: any) => r.status !== 'queued' && r.status !== 'failed').length
    const opened = data.filter((r: any) => ['opened', 'clicked', 'replied'].includes(r.status)).length
    const replied = data.filter((r: any) => r.status === 'replied').length
    const pending = data.filter((r: any) => r.status === 'sent').length

    return {
      totalSent,
      opened,
      replied,
      pending,
      openRate: totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0,
      replyRate: totalSent > 0 ? Math.round((replied / totalSent) * 100) : 0
    }
  }

  /**
   * Format email body as HTML
   */
  private formatEmailHtml(body: string, trackingId?: string): string {
    // Convert plain text to HTML with proper formatting
    const htmlBody = body
      .split('\n\n')
      .map(para => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${para.replace(/\n/g, '<br>')}</p>`)
      .join('')

    // Add tracking pixel if tracking ID provided
    const trackingPixel = trackingId
      ? `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/outreach/track?id=${trackingId}&type=open" width="1" height="1" style="display:none;" />`
      : ''

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${htmlBody}
          ${trackingPixel}
        </body>
      </html>
    `
  }
}

// Singleton
let emailOutreachService: EmailOutreachService | null = null

export function getEmailOutreachService(): EmailOutreachService {
  if (!emailOutreachService) {
    emailOutreachService = new EmailOutreachService()
  }
  return emailOutreachService
}
