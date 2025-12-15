/**
 * Stripe Configuration
 *
 * Handles Stripe client initialization and pricing
 */

import Stripe from 'stripe'

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil'
})

// Pricing configuration
export const PRICING = {
  balance: {
    monthly: {
      priceId: process.env.STRIPE_BALANCE_MONTHLY_PRICE_ID!,
      amount: 9900, // $99.00
      interval: 'month' as const
    },
    annual: {
      priceId: process.env.STRIPE_BALANCE_ANNUAL_PRICE_ID!,
      amount: 89900, // $899.00 (save ~$289/year)
      interval: 'year' as const
    }
  },
  harmony: {
    monthly: {
      priceId: process.env.STRIPE_HARMONY_MONTHLY_PRICE_ID!,
      amount: 99900, // $999.00
      interval: 'month' as const
    },
    annual: {
      priceId: process.env.STRIPE_HARMONY_ANNUAL_PRICE_ID!,
      amount: 899900, // $8,999.00 (save ~$2,989/year)
      interval: 'year' as const
    }
  }
} as const

export type PlanType = 'balance' | 'harmony'
export type BillingCycle = 'monthly' | 'annual'

/**
 * Get the Stripe price ID for a given plan and billing cycle
 */
export function getPriceId(plan: PlanType, billingCycle: BillingCycle): string {
  return PRICING[plan][billingCycle].priceId
}

/**
 * Get the amount for a given plan and billing cycle
 */
export function getAmount(plan: PlanType, billingCycle: BillingCycle): number {
  return PRICING[plan][billingCycle].amount
}
