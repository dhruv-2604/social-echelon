/**
 * Create Stripe Checkout Session
 *
 * POST /api/payment/create-checkout
 * Creates a Stripe Checkout session for subscription payment
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getPriceId, PlanType, BillingCycle } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CheckoutSchema = z.object({
  plan: z.enum(['balance', 'harmony']),
  billingCycle: z.enum(['monthly', 'annual'])
})

export const POST = withSecurityHeaders(
  withAuthAndValidation({
    body: CheckoutSchema
  })(async (request: NextRequest, userId: string, { validatedBody }) => {
    try {
      const { plan, billingCycle } = validatedBody!
      const supabase = getSupabaseAdmin()

      // Get user's email
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('email, stripe_customer_id')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      let customerId = (user as any).stripe_customer_id

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await getStripe().customers.create({
          email: (user as any).email,
          metadata: {
            userId
          }
        })
        customerId = customer.id

        // Save customer ID
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId)
      }

      // Get the price ID
      const priceId = getPriceId(plan as PlanType, billingCycle as BillingCycle)

      if (!priceId) {
        return NextResponse.json(
          { error: 'Invalid plan configuration. Please contact support.' },
          { status: 400 }
        )
      }

      // Create checkout session
      const session = await getStripe().checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/connect?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup?payment=cancelled`,
        metadata: {
          userId,
          plan,
          billingCycle
        },
        subscription_data: {
          metadata: {
            userId,
            plan,
            billingCycle
          }
        },
        allow_promotion_codes: true
      })

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        url: session.url
      })

    } catch (error) {
      console.error('Create checkout error:', error)
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }
  })
)
