/**
 * Message Relay Service
 *
 * Handles masked email communication between brands and creators.
 * Like Craigslist/Airbnb - users email a relay address, we forward to the real recipient.
 *
 * Flow:
 * 1. Creator says "Yes" to a brief → we create a relay
 * 2. Brand gets relay email: match-abc123@relay.socialechelon.co
 * 3. Brand emails relay → we forward to creator's real email
 * 4. Creator replies → we forward back to brand
 * 5. All messages logged for wellness tracking
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nanoid } from 'nanoid'

// Relay domain - should be configured in Resend for inbound emails
const RELAY_DOMAIN = process.env.RELAY_EMAIL_DOMAIN || 'relay.socialechelon.co'

interface CreateRelayParams {
  matchId: string
  briefId: string
  brandUserId: string
  creatorUserId: string
}

interface RelayInfo {
  id: string
  relayEmail: string
  brandEmail: string
  creatorEmail: string
  status: string
  lastMessageAt: string | null
  createdAt: string
}

interface ForwardEmailParams {
  relayEmail: string
  fromEmail: string
  subject: string
  body: string
  resendMessageId?: string
}

interface ForwardResult {
  success: boolean
  direction?: 'brand_to_creator' | 'creator_to_brand'
  recipientEmail?: string
  error?: string
}

/**
 * Generate a unique relay email address
 */
function generateRelayEmail(): string {
  // Generate a short, URL-safe ID
  const shortId = nanoid(10)
  return `match-${shortId}@${RELAY_DOMAIN}`
}

/**
 * Create a message relay for a brief match
 * Called when creator responds "yes" to an opportunity
 */
export async function createRelayForMatch(params: CreateRelayParams): Promise<{
  success: boolean
  relayEmail?: string
  error?: string
}> {
  const supabase = getSupabaseAdmin()

  try {
    // Get the brand and creator email addresses
    const { data: brandProfile, error: brandError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', params.brandUserId)
      .single()

    if (brandError || !brandProfile) {
      return { success: false, error: 'Brand profile not found' }
    }

    const { data: creatorProfile, error: creatorError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', params.creatorUserId)
      .single()

    if (creatorError || !creatorProfile) {
      return { success: false, error: 'Creator profile not found' }
    }

    const brandEmail = (brandProfile as { email: string }).email
    const creatorEmail = (creatorProfile as { email: string }).email

    // Generate unique relay email
    const relayEmail = generateRelayEmail()

    // Create the relay record
    const { data: relay, error: insertError } = await supabase
      .from('message_relays')
      .insert({
        relay_email: relayEmail,
        brief_match_id: params.matchId,
        brand_user_id: params.brandUserId,
        creator_user_id: params.creatorUserId,
        brand_email: brandEmail,
        creator_email: creatorEmail,
        status: 'active'
      })
      .select('id, relay_email')
      .single()

    if (insertError) {
      console.error('Error creating relay:', insertError)
      return { success: false, error: `Failed to create relay: ${insertError.message}` }
    }

    // Update the brief_match with the relay email for quick access
    await supabase
      .from('brief_matches')
      .update({ relay_email: relayEmail })
      .eq('id', params.matchId)

    return {
      success: true,
      relayEmail: (relay as { relay_email: string }).relay_email
    }

  } catch (error) {
    console.error('Create relay error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get relay info by relay email address
 */
export async function getRelayByEmail(relayEmail: string): Promise<RelayInfo | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('message_relays')
    .select('*')
    .eq('relay_email', relayEmail)
    .single()

  if (error || !data) {
    return null
  }

  const relay = data as {
    id: string
    relay_email: string
    brand_email: string
    creator_email: string
    status: string
    last_message_at: string | null
    created_at: string
  }

  return {
    id: relay.id,
    relayEmail: relay.relay_email,
    brandEmail: relay.brand_email,
    creatorEmail: relay.creator_email,
    status: relay.status,
    lastMessageAt: relay.last_message_at,
    createdAt: relay.created_at
  }
}

/**
 * Get relay info by match ID
 */
export async function getRelayByMatchId(matchId: string): Promise<RelayInfo | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('message_relays')
    .select('*')
    .eq('brief_match_id', matchId)
    .single()

  if (error || !data) {
    return null
  }

  const relay = data as {
    id: string
    relay_email: string
    brand_email: string
    creator_email: string
    status: string
    last_message_at: string | null
    created_at: string
  }

  return {
    id: relay.id,
    relayEmail: relay.relay_email,
    brandEmail: relay.brand_email,
    creatorEmail: relay.creator_email,
    status: relay.status,
    lastMessageAt: relay.last_message_at,
    createdAt: relay.created_at
  }
}

/**
 * Forward an email through the relay system
 * Determines direction based on sender and forwards to appropriate recipient
 */
export async function forwardEmail(params: ForwardEmailParams): Promise<ForwardResult> {
  const supabase = getSupabaseAdmin()

  try {
    // Get the relay by email address
    const relay = await getRelayByEmail(params.relayEmail)

    if (!relay) {
      return { success: false, error: 'Relay not found' }
    }

    if (relay.status !== 'active') {
      return { success: false, error: 'Relay is no longer active' }
    }

    // Determine direction based on sender
    const fromEmailLower = params.fromEmail.toLowerCase()
    const brandEmailLower = relay.brandEmail.toLowerCase()
    const creatorEmailLower = relay.creatorEmail.toLowerCase()

    let direction: 'brand_to_creator' | 'creator_to_brand'
    let recipientEmail: string
    let replyToEmail: string

    if (fromEmailLower === brandEmailLower) {
      direction = 'brand_to_creator'
      recipientEmail = relay.creatorEmail
      replyToEmail = relay.relayEmail // Reply goes back to relay
    } else if (fromEmailLower === creatorEmailLower) {
      direction = 'creator_to_brand'
      recipientEmail = relay.brandEmail
      replyToEmail = relay.relayEmail
    } else {
      // Unknown sender - could be a forwarded email or alias
      // Try to match by domain or partial match
      console.warn(`Unknown sender: ${params.fromEmail} for relay ${params.relayEmail}`)
      return { success: false, error: 'Sender not recognized for this conversation' }
    }

    // Calculate response time if this is a reply
    let responseTimeMinutes: number | null = null
    const { data: lastMessage } = await supabase
      .from('relayed_messages')
      .select('sent_at, direction')
      .eq('relay_id', relay.id)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()

    if (lastMessage) {
      const last = lastMessage as { sent_at: string; direction: string }
      // Only calculate if it's a reply (opposite direction)
      if (last.direction !== direction) {
        const lastSentAt = new Date(last.sent_at)
        const now = new Date()
        responseTimeMinutes = Math.round((now.getTime() - lastSentAt.getTime()) / 60000)
      }
    }

    // Send the forwarded email via Resend
    const sendResult = await sendForwardedEmail({
      to: recipientEmail,
      from: params.relayEmail,
      replyTo: replyToEmail,
      subject: params.subject,
      body: params.body
    })

    if (!sendResult.success) {
      return { success: false, error: sendResult.error }
    }

    // Log the message
    await supabase
      .from('relayed_messages')
      .insert({
        relay_id: relay.id,
        resend_message_id: params.resendMessageId || sendResult.messageId,
        direction,
        subject: params.subject,
        body_preview: params.body.substring(0, 500),
        from_email: params.fromEmail,
        sent_at: new Date().toISOString(),
        response_time_minutes: responseTimeMinutes
      })

    // Update last_message_at on the relay
    await supabase
      .from('message_relays')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', relay.id)

    return {
      success: true,
      direction,
      recipientEmail
    }

  } catch (error) {
    console.error('Forward email error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Send a forwarded email via Resend
 */
async function sendForwardedEmail(params: {
  to: string
  from: string
  replyTo: string
  subject: string
  body: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.error('RESEND_API_KEY not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    // Format the from address
    const fromName = 'Social Echelon Relay'
    const fromAddress = `${fromName} <${params.from}>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: params.to,
        reply_to: params.replyTo,
        subject: params.subject,
        html: formatEmailHtml(params.body),
        text: params.body // Plain text fallback
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
    console.error('Send forwarded email error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Format email body as HTML
 */
function formatEmailHtml(body: string): string {
  // Convert plain text to HTML with proper formatting
  const htmlBody = body
    .split('\n\n')
    .map(para => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${htmlBody}
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
        <p style="font-size: 12px; color: #888;">
          This message was sent through Social Echelon's secure relay.
          Reply directly to this email to continue the conversation.
        </p>
      </body>
    </html>
  `
}

/**
 * Get message history for a relay
 */
export async function getRelayMessages(relayId: string, limit = 50): Promise<{
  id: string
  direction: string
  subject: string | null
  bodyPreview: string | null
  fromEmail: string
  sentAt: string
  responseTimeMinutes: number | null
}[]> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('relayed_messages')
    .select('*')
    .eq('relay_id', relayId)
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  const messages = data as {
    id: string
    direction: string
    subject: string | null
    body_preview: string | null
    from_email: string
    sent_at: string
    response_time_minutes: number | null
  }[]

  return messages.map(msg => ({
    id: msg.id,
    direction: msg.direction,
    subject: msg.subject,
    bodyPreview: msg.body_preview,
    fromEmail: msg.from_email,
    sentAt: msg.sent_at,
    responseTimeMinutes: msg.response_time_minutes
  }))
}

/**
 * Close a relay (partnership ended or cancelled)
 */
export async function closeRelay(relayId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('message_relays')
    .update({ status: 'closed' })
    .eq('id', relayId)

  return !error
}

/**
 * Get wellness metrics for a relay
 */
export async function getRelayWellnessMetrics(relayId: string): Promise<{
  totalMessages: number
  brandMessages: number
  creatorMessages: number
  avgResponseTimeMinutes: number | null
  lastActivityAt: string | null
}> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('relayed_messages')
    .select('direction, response_time_minutes, sent_at')
    .eq('relay_id', relayId)

  if (error || !data || data.length === 0) {
    return {
      totalMessages: 0,
      brandMessages: 0,
      creatorMessages: 0,
      avgResponseTimeMinutes: null,
      lastActivityAt: null
    }
  }

  const messages = data as {
    direction: string
    response_time_minutes: number | null
    sent_at: string
  }[]

  const brandMessages = messages.filter(m => m.direction === 'brand_to_creator').length
  const creatorMessages = messages.filter(m => m.direction === 'creator_to_brand').length

  // Calculate average response time (excluding nulls)
  const responseTimes = messages
    .filter(m => m.response_time_minutes !== null)
    .map(m => m.response_time_minutes as number)

  const avgResponseTimeMinutes = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null

  // Get last activity
  const sortedBySent = [...messages].sort((a, b) =>
    new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  )

  return {
    totalMessages: messages.length,
    brandMessages,
    creatorMessages,
    avgResponseTimeMinutes,
    lastActivityAt: sortedBySent[0]?.sent_at || null
  }
}
