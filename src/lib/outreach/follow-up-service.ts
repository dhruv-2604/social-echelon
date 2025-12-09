/**
 * Smart Follow-up Service
 *
 * Automatically sends follow-up emails at optimal intervals
 * Schedule: Day 3 (gentle bump), Day 7 (value-add), Day 14 (final)
 *
 * Wellness mission: Creator sets it and forgets it - we handle persistence
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getEmailOutreachService } from './email-service'

interface FollowUpMessage {
  id: string
  userId: string
  brandId: string
  matchId: string
  toEmail: string
  originalSubject: string
  originalBody: string
  followUpCount: number
  brandName: string
  creatorEmail: string
  creatorName: string
}

interface FollowUpResult {
  outreachId: string
  brandName: string
  success: boolean
  error?: string
  followUpNumber: number
}

// Follow-up schedule: days after initial email
const FOLLOW_UP_SCHEDULE = {
  1: 3,   // First follow-up: 3 days after initial
  2: 7,   // Second follow-up: 7 days after initial (4 days after first)
  3: 14   // Final follow-up: 14 days after initial (7 days after second)
}

const MAX_FOLLOW_UPS = 3

export class FollowUpService {
  /**
   * Get all outreach messages due for follow-up
   */
  async getDueFollowUps(): Promise<FollowUpMessage[]> {
    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('outreach_messages')
      .select(`
        id,
        user_id,
        brand_id,
        match_id,
        to_email,
        subject,
        body,
        follow_up_count,
        brands (name),
        profiles:user_id (email, full_name)
      `)
      .in('status', ['sent', 'opened']) // Only follow up on sent/opened (not replied/bounced)
      .lt('next_follow_up_at', now) // Due for follow-up
      .not('next_follow_up_at', 'is', null) // Has a scheduled follow-up
      .lt('follow_up_count', MAX_FOLLOW_UPS) // Haven't maxed out follow-ups
      .order('next_follow_up_at', { ascending: true })
      .limit(50) // Process in batches

    if (error) {
      console.error('Error fetching due follow-ups:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      brandId: row.brand_id,
      matchId: row.match_id,
      toEmail: row.to_email,
      originalSubject: row.subject,
      originalBody: row.body,
      followUpCount: row.follow_up_count,
      brandName: row.brands?.name || 'the brand',
      creatorEmail: row.profiles?.email || '',
      creatorName: row.profiles?.full_name || 'Creator'
    }))
  }

  /**
   * Send follow-up for a single outreach
   */
  async sendFollowUp(message: FollowUpMessage): Promise<FollowUpResult> {
    const supabase = getSupabaseAdmin()
    const emailService = getEmailOutreachService()

    const followUpNumber = message.followUpCount + 1
    const template = this.getFollowUpTemplate(followUpNumber, message)

    try {
      // Create follow-up record
      const { data: followUp, error: insertError } = await supabase
        .from('outreach_messages')
        .insert({
          user_id: message.userId,
          brand_id: message.brandId,
          match_id: message.matchId,
          to_email: message.toEmail,
          subject: template.subject,
          body: template.body,
          status: 'queued',
          follow_up_count: followUpNumber,
          parent_message_id: message.id,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (insertError || !followUp) {
        throw new Error(`Failed to create follow-up record: ${insertError?.message}`)
      }

      const followUpId = (followUp as any).id

      // Send the email
      const result = await emailService.sendEmail({
        to: message.toEmail,
        subject: template.subject,
        body: template.body,
        replyTo: message.creatorEmail,
        trackingId: followUpId
      })

      if (result.success) {
        // Update the follow-up record
        await supabase
          .from('outreach_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            message_id: result.messageId,
            next_follow_up_at: this.getNextFollowUpDate(followUpNumber)
          })
          .eq('id', followUpId)

        // Update the original message - cancel its follow-up (the new one handles it)
        await supabase
          .from('outreach_messages')
          .update({
            follow_up_count: followUpNumber,
            next_follow_up_at: null // Clear the original's next follow-up
          })
          .eq('id', message.id)

        return {
          outreachId: message.id,
          brandName: message.brandName,
          success: true,
          followUpNumber
        }
      } else {
        // Mark follow-up as failed
        await supabase
          .from('outreach_messages')
          .update({
            status: 'failed',
            error_message: result.error
          })
          .eq('id', followUpId)

        return {
          outreachId: message.id,
          brandName: message.brandName,
          success: false,
          error: result.error,
          followUpNumber
        }
      }
    } catch (error) {
      console.error('Follow-up send error:', error)
      return {
        outreachId: message.id,
        brandName: message.brandName,
        success: false,
        error: String(error),
        followUpNumber
      }
    }
  }

  /**
   * Process all due follow-ups (called by cron/manual trigger)
   */
  async processAllDueFollowUps(): Promise<{
    processed: number
    successful: number
    failed: number
    results: FollowUpResult[]
  }> {
    const dueFollowUps = await this.getDueFollowUps()
    const results: FollowUpResult[] = []

    console.log(`📬 Processing ${dueFollowUps.length} due follow-ups`)

    for (const message of dueFollowUps) {
      // Add small delay between emails to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500))

      const result = await this.sendFollowUp(message)
      results.push(result)

      if (result.success) {
        console.log(`✅ Follow-up #${result.followUpNumber} sent to ${message.brandName}`)
      } else {
        console.log(`❌ Follow-up failed for ${message.brandName}: ${result.error}`)
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return {
      processed: dueFollowUps.length,
      successful,
      failed,
      results
    }
  }

  /**
   * Get pending follow-ups for a user's dashboard
   */
  async getUserPendingFollowUps(userId: string): Promise<{
    upcoming: Array<{
      brandName: string
      followUpNumber: number
      scheduledFor: Date
      originalSentAt: Date
    }>
    stats: {
      totalScheduled: number
      dueToday: number
      dueThisWeek: number
    }
  }> {
    const supabase = getSupabaseAdmin()
    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + 7)

    const { data } = await supabase
      .from('outreach_messages')
      .select(`
        id,
        follow_up_count,
        next_follow_up_at,
        sent_at,
        brands (name)
      `)
      .eq('user_id', userId)
      .in('status', ['sent', 'opened'])
      .not('next_follow_up_at', 'is', null)
      .lt('follow_up_count', MAX_FOLLOW_UPS)
      .order('next_follow_up_at', { ascending: true })
      .limit(20)

    const upcoming = (data || []).map((row: any) => ({
      brandName: row.brands?.name || 'Unknown Brand',
      followUpNumber: row.follow_up_count + 1,
      scheduledFor: new Date(row.next_follow_up_at),
      originalSentAt: new Date(row.sent_at)
    }))

    const dueToday = upcoming.filter(u => u.scheduledFor <= endOfDay).length
    const dueThisWeek = upcoming.filter(u => u.scheduledFor <= endOfWeek).length

    return {
      upcoming,
      stats: {
        totalScheduled: upcoming.length,
        dueToday,
        dueThisWeek
      }
    }
  }

  /**
   * Cancel follow-ups for an outreach (e.g., brand replied)
   */
  async cancelFollowUps(outreachId: string): Promise<void> {
    const supabase = getSupabaseAdmin()

    await supabase
      .from('outreach_messages')
      .update({ next_follow_up_at: null })
      .eq('id', outreachId)

    // Also cancel any child follow-ups
    await supabase
      .from('outreach_messages')
      .update({ next_follow_up_at: null })
      .eq('parent_message_id', outreachId)
  }

  /**
   * Get the follow-up email template based on follow-up number
   */
  private getFollowUpTemplate(followUpNumber: number, message: FollowUpMessage): {
    subject: string
    body: string
  } {
    const firstName = message.creatorName.split(' ')[0]

    switch (followUpNumber) {
      case 1:
        // Day 3: Gentle bump
        return {
          subject: `Re: ${message.originalSubject}`,
          body: `Hi there,

I wanted to follow up on my previous email about a potential collaboration with ${message.brandName}.

I understand you're busy, but I'd love to chat if there's an opportunity to work together. I'm flexible on timing and format.

Would you have 15 minutes for a quick call this week?

Best,
${firstName}`
        }

      case 2:
        // Day 7: Value-add
        return {
          subject: `Re: ${message.originalSubject}`,
          body: `Hi,

Following up once more on my partnership inquiry. I recently created some content that might give you a better sense of my style and audience engagement.

I'd be happy to share specific campaign ideas tailored to ${message.brandName}'s goals if that would be helpful.

Let me know if you'd like to explore this further!

Best,
${firstName}`
        }

      case 3:
        // Day 14: Final, graceful close
        return {
          subject: `Re: ${message.originalSubject}`,
          body: `Hi,

I wanted to send one final note about collaborating with ${message.brandName}.

I completely understand if the timing isn't right or if this isn't a fit - no hard feelings at all.

If things change in the future, I'd still love to connect. Feel free to reach out anytime.

Wishing you and the team all the best!

${firstName}`
        }

      default:
        // Shouldn't happen, but fallback
        return {
          subject: `Re: ${message.originalSubject}`,
          body: `Hi, just following up on my previous email. Let me know if you'd like to discuss further.\n\nBest,\n${firstName}`
        }
    }
  }

  /**
   * Calculate next follow-up date based on current follow-up number
   */
  private getNextFollowUpDate(currentFollowUpNumber: number): string | null {
    const nextNumber = currentFollowUpNumber + 1

    if (nextNumber > MAX_FOLLOW_UPS) {
      return null // No more follow-ups
    }

    const daysFromNow = FOLLOW_UP_SCHEDULE[nextNumber as keyof typeof FOLLOW_UP_SCHEDULE] -
                         FOLLOW_UP_SCHEDULE[currentFollowUpNumber as keyof typeof FOLLOW_UP_SCHEDULE]

    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString()
  }
}

// Singleton
let followUpService: FollowUpService | null = null

export function getFollowUpService(): FollowUpService {
  if (!followUpService) {
    followUpService = new FollowUpService()
  }
  return followUpService
}
