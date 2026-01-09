/**
 * Resend Webhook Handler
 *
 * POST /api/webhooks/resend
 * Handles inbound emails to relay addresses (match-xxx@relay.socialechelon.co)
 *
 * Flow:
 * 1. Resend receives email to relay address
 * 2. Resend POSTs to this webhook with email data
 * 3. We look up the relay and forward to the appropriate recipient
 * 4. All messages logged for wellness tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { forwardEmail, getRelayByEmail } from '@/lib/messaging'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Types for Resend webhook payloads
interface ResendInboundEmail {
  type: 'email.received'
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    text?: string
    html?: string
    reply_to?: string
    headers?: Record<string, string>
  }
}

interface ResendWebhookEvent {
  type: string
  created_at: string
  data: {
    email_id?: string
    from?: string
    to?: string | string[]
    subject?: string
    text?: string
    html?: string
    [key: string]: unknown
  }
}

/**
 * Verify Resend webhook signature
 * @see https://resend.com/docs/webhooks
 */
function verifyResendSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

  // Skip verification in development if no secret configured
  if (!webhookSecret) {
    console.warn('RESEND_WEBHOOK_SECRET not configured - skipping signature verification')
    return true
  }

  if (!signature || !timestamp) {
    return false
  }

  // Resend uses HMAC SHA256 with timestamp
  const signedPayload = `${timestamp}.${payload}`
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex')

  // Compare in constant time to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

/**
 * Extract plain text from email
 * Prefers text over HTML, strips HTML if needed
 */
function extractEmailBody(event: ResendWebhookEvent): string {
  // Prefer plain text
  if (event.data.text) {
    return event.data.text
  }

  // Fall back to HTML stripped of tags
  if (event.data.html) {
    return (event.data.html as string)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
  }

  return ''
}

/**
 * Handle inbound email event
 */
async function handleInboundEmail(event: ResendWebhookEvent) {
  const { data } = event

  // Get the relay email from the 'to' field
  const toAddresses = Array.isArray(data.to) ? data.to : [data.to]
  const relayEmail = toAddresses.find(addr =>
    addr?.includes('@relay.socialechelon') ||
    addr?.includes('match-')
  )

  if (!relayEmail) {
    console.log('No relay email found in recipients:', toAddresses)
    return { success: false, error: 'No relay email in recipients' }
  }

  // Clean the relay email (remove any display name)
  const cleanRelayEmail = relayEmail.match(/<([^>]+)>/)?.[1] || relayEmail

  // Check if relay exists
  const relay = await getRelayByEmail(cleanRelayEmail)
  if (!relay) {
    console.log('Relay not found:', cleanRelayEmail)
    return { success: false, error: 'Relay not found' }
  }

  // Extract sender email
  const fromEmail = (data.from as string)?.match(/<([^>]+)>/)?.[1] || data.from as string

  // Forward the email
  const result = await forwardEmail({
    relayEmail: cleanRelayEmail,
    fromEmail,
    subject: data.subject || '(No subject)',
    body: extractEmailBody(event),
    resendMessageId: data.email_id
  })

  if (result.success) {
    console.log(`Email forwarded: ${fromEmail} -> ${result.recipientEmail} (${result.direction})`)
  } else {
    console.error(`Failed to forward email: ${result.error}`)
  }

  return result
}

/**
 * Handle email delivery/bounce/etc events
 * These can be used for additional tracking
 */
async function handleDeliveryEvent(event: ResendWebhookEvent) {
  // Log delivery events for debugging
  console.log(`Email event: ${event.type}`, {
    emailId: event.data.email_id,
    to: event.data.to
  })

  // Could update relayed_messages with delivery status
  // For now, just log
  return { success: true }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // Get signature headers
    const signature = request.headers.get('resend-signature')
    const timestamp = request.headers.get('resend-timestamp')

    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!verifyResendSignature(body, signature, timestamp)) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(body) as ResendWebhookEvent

    console.log(`Resend webhook: ${event.type}`, {
      hasData: !!event.data,
      dataKeys: event.data ? Object.keys(event.data) : []
    })

    // Handle different event types
    switch (event.type) {
      case 'email.received':
        // Inbound email - this is what we care about most
        await handleInboundEmail(event)
        break

      case 'email.delivered':
      case 'email.bounced':
      case 'email.complained':
      case 'email.opened':
      case 'email.clicked':
        // Outbound email events - useful for tracking
        await handleDeliveryEvent(event)
        break

      default:
        console.log(`Unhandled Resend event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Resend webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Also handle GET for webhook verification
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    webhook: 'resend',
    message: 'Resend webhook endpoint is active'
  })
}
