/**
 * Stripe Webhook Handler
 *
 * POST /api/webhooks/stripe
 * Handles Stripe subscription events
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Disable body parsing - we need raw body for signature verification
export const runtime = 'nodejs'

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const supabase = getSupabaseAdmin()
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan
  const billingCycle = session.metadata?.billingCycle

  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as any

  // Calculate expiration
  const expiresAt = new Date(subscription.current_period_end * 1000).toISOString()

  // Update user's subscription status
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_plan: plan,
      billing_cycle: billingCycle,
      stripe_subscription_id: subscription.id,
      subscription_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  console.log(`✅ Subscription activated for user ${userId}: ${plan} (${billingCycle})`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = getSupabaseAdmin()
  const userId = subscription.metadata?.userId

  if (!userId) {
    // Try to find user by customer ID
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single()

    if (!user) {
      console.error('Could not find user for subscription update')
      return
    }

    const expiresAt = new Date(subscription.current_period_end * 1000).toISOString()

    await supabase
      .from('profiles')
      .update({
        subscription_status: subscription.status === 'active' ? 'active' : 'past_due',
        subscription_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', (user as any).id)

    return
  }

  const expiresAt = new Date(subscription.current_period_end * 1000).toISOString()

  await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status === 'active' ? 'active' : 'past_due',
      subscription_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = getSupabaseAdmin()

  // Find user by subscription ID
  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!user) {
    console.error('Could not find user for subscription deletion')
    return
  }

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', (user as any).id)

  console.log(`🚫 Subscription cancelled for user ${(user as any).id}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = getSupabaseAdmin()

  // Find user by customer ID
  const { data: user } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('stripe_customer_id', invoice.customer as string)
    .single()

  if (!user) {
    console.error('Could not find user for payment failure')
    return
  }

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('id', (user as any).id)

  console.log(`⚠️ Payment failed for user ${(user as any).id}`)
  // TODO: Send email notification about payment failure
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
