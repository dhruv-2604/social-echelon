/**
 * Notification Service
 * Handles notifications for brief matches and partnership updates
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { MatchResult } from './brief-matcher'

export interface NotificationPayload {
  userId: string
  type: 'new_brief_match' | 'brief_response' | 'partnership_update' | 'message'
  title: string
  body: string
  data?: Record<string, unknown>
}

/**
 * Create in-app notifications for matched creators
 */
export async function notifyMatchedCreators(
  supabase: SupabaseClient,
  briefId: string,
  brandName: string,
  matches: MatchResult[]
): Promise<{ success: boolean; notified: number }> {
  if (matches.length === 0) {
    return { success: true, notified: 0 }
  }

  // Fetch brief details for the notification
  const { data: brief, error: briefError } = await supabase
    .from('campaign_briefs')
    .select('title, campaign_type, budget_min, budget_max')
    .eq('id', briefId)
    .single()

  if (briefError || !brief) {
    console.error('Error fetching brief for notification:', briefError)
    return { success: false, notified: 0 }
  }

  const budgetText = brief.budget_min && brief.budget_max
    ? `$${brief.budget_min} - $${brief.budget_max}`
    : brief.budget_max
    ? `Up to $${brief.budget_max}`
    : 'Budget negotiable'

  // Create notifications for each matched creator
  const notifications = matches.map(match => ({
    user_id: match.creatorId,
    type: 'new_brief_match',
    title: 'New Partnership Opportunity',
    body: `${brandName} is looking for creators! Campaign: "${brief.title}" (${budgetText})`,
    data: {
      brief_id: briefId,
      match_id: match.creatorId, // Will be updated after match is saved
      match_score: match.matchScore,
      campaign_types: brief.campaign_type
    },
    read: false,
    created_at: new Date().toISOString()
  }))

  // Check if notifications table exists, if not skip (graceful degradation)
  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications)

  if (insertError) {
    // Table might not exist yet - log but don't fail
    console.log('Notifications table not available, skipping in-app notifications:', insertError.message)
    // TODO: Send email notifications as fallback
    return { success: true, notified: 0 }
  }

  return { success: true, notified: matches.length }
}

/**
 * Notify brand when a creator responds to their brief
 */
export async function notifyBrandOfResponse(
  supabase: SupabaseClient,
  briefId: string,
  brandUserId: string,
  creatorName: string,
  response: 'yes' | 'no' | 'maybe'
): Promise<boolean> {
  const responseText = {
    yes: 'is interested in your campaign!',
    no: 'has declined your campaign.',
    maybe: 'wants more information about your campaign.'
  }

  const notification = {
    user_id: brandUserId,
    type: 'brief_response',
    title: response === 'yes' ? 'New Creator Interest!' : 'Creator Response',
    body: `${creatorName} ${responseText[response]}`,
    data: {
      brief_id: briefId,
      response
    },
    read: false,
    created_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('notifications')
    .insert(notification)

  if (error) {
    console.log('Error creating notification:', error.message)
    return false
  }

  return true
}

/**
 * Send email notification (placeholder for future implementation)
 * Uses Resend which is already configured in the project
 */
export async function sendEmailNotification(
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  // TODO: Implement email sending using Resend
  // For now, just log
  console.log(`[Email Notification] To: ${to}, Subject: ${subject}`)

  // Uncomment when ready to send emails:
  /*
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Social Echelon <notifications@socialechelon.com>',
      to,
      subject,
      html: htmlContent
    })
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
  */

  return true
}

/**
 * Generate email content for new brief match
 */
export function generateBriefMatchEmail(
  creatorName: string,
  brandName: string,
  briefTitle: string,
  budget: string,
  matchScore: number
): { subject: string; html: string } {
  const subject = `New Partnership Opportunity from ${brandName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
        .cta { display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
        .match-score { background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">New Partnership Opportunity!</h1>
        </div>
        <div class="content">
          <p>Hi ${creatorName},</p>
          <p><strong>${brandName}</strong> is looking for creators like you!</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${briefTitle}</h3>
            <p><strong>Budget:</strong> ${budget}</p>
            <p><span class="match-score">${matchScore}% Match</span></p>
          </div>

          <p>This campaign matches your profile and availability. Check out the details and respond directly in your dashboard.</p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://socialechelon.com'}/dashboard/opportunities" class="cta">
            View Opportunity
          </a>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You're receiving this because you're set as actively seeking partnerships.
            Update your preferences in Settings if you'd like to pause notifications.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}
