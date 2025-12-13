/**
 * Auto-Enrichment Service
 *
 * Batch job to:
 * 1. Verify emails on unverified brands
 * 2. Update hiring confidence based on response data
 * 3. Flag stale data that needs refresh
 *
 * Designed for manual trigger or lightweight cron (within Vercel limits)
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getEmailVerificationService } from './email-verification-service'

interface EnrichmentResult {
  processed: number
  emailsVerified: number
  confidenceUpdated: number
  staleDataFlagged: number
  errors: string[]
}

export class AutoEnrichmentService {
  private batchSize = 10 // Keep small for Vercel timeout limits

  /**
   * Run full enrichment pipeline
   */
  async runEnrichment(): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      processed: 0,
      emailsVerified: 0,
      confidenceUpdated: 0,
      staleDataFlagged: 0,
      errors: []
    }

    try {
      // 1. Verify unverified emails
      const emailResult = await this.verifyUnverifiedEmails()
      result.emailsVerified = emailResult.verified
      result.processed += emailResult.processed
      result.errors.push(...emailResult.errors)

      // 2. Update hiring confidence based on response rates
      const confidenceResult = await this.updateHiringConfidence()
      result.confidenceUpdated = confidenceResult.updated
      result.processed += confidenceResult.processed

      // 3. Flag stale data
      const staleResult = await this.flagStaleData()
      result.staleDataFlagged = staleResult.flagged

    } catch (error) {
      result.errors.push(`Pipeline error: ${error}`)
    }

    return result
  }

  /**
   * Verify emails for brands that have pr_email but aren't verified
   */
  async verifyUnverifiedEmails(): Promise<{
    processed: number
    verified: number
    errors: string[]
  }> {
    const supabase = getSupabaseAdmin()
    const emailService = getEmailVerificationService()
    const errors: string[] = []
    let verified = 0

    // Get brands with emails that need verification
    const { data: brands, error } = await supabase
      .from('brands')
      .select('id, name, website, pr_email')
      .eq('email_verified', false)
      .not('pr_email', 'is', null)
      .limit(this.batchSize)

    if (error || !brands) {
      return { processed: 0, verified: 0, errors: [error?.message || 'Failed to fetch brands'] }
    }

    for (const brand of brands) {
      try {
        const result = await emailService.verifyEmail((brand as any).pr_email)

        await supabase
          .from('brands')
          .update({
            email_verified: result.verified,
            email_verified_at: result.verified ? new Date().toISOString() : null,
            email_verification_source: 'hunter'
          })
          .eq('id', (brand as any).id)

        if (result.verified) verified++
      } catch (err) {
        errors.push(`Failed to verify ${brand.name}: ${err}`)
      }
    }

    return { processed: brands.length, verified, errors }
  }

  /**
   * Update hiring confidence based on actual response data
   */
  async updateHiringConfidence(): Promise<{
    processed: number
    updated: number
  }> {
    const supabase = getSupabaseAdmin()
    let updated = 0

    // Get brands with outreach data
    const { data: brands, error } = await supabase
      .from('brands')
      .select('id, total_outreach_sent, total_responses, positive_responses, hiring_confidence')
      .gt('total_outreach_sent', 5) // Only update if we have enough data
      .limit(this.batchSize * 2)

    if (error || !brands) {
      return { processed: 0, updated: 0 }
    }

    for (const brand of brands) {
      const outreach = (brand as any).total_outreach_sent || 0
      const responses = (brand as any).total_responses || 0
      const positive = (brand as any).positive_responses || 0
      const currentConfidence = (brand as any).hiring_confidence || 50

      // Calculate new confidence score
      const responseRate = outreach > 0 ? responses / outreach : 0
      const positiveRate = responses > 0 ? positive / responses : 0

      // Weighted scoring:
      // - High response rate = actively looking
      // - High positive rate = good fit signals
      let newConfidence = 50 // Base

      if (responseRate > 0.3) newConfidence += 25
      else if (responseRate > 0.15) newConfidence += 15
      else if (responseRate > 0.05) newConfidence += 5
      else if (responseRate < 0.02 && outreach > 20) newConfidence -= 20

      if (positiveRate > 0.5) newConfidence += 20
      else if (positiveRate > 0.25) newConfidence += 10

      newConfidence = Math.max(10, Math.min(95, newConfidence))

      // Only update if significant change
      if (Math.abs(newConfidence - currentConfidence) >= 10) {
        await supabase
          .from('brands')
          .update({
            hiring_confidence: newConfidence,
            is_actively_hiring: newConfidence >= 50
          })
          .eq('id', (brand as any).id)

        updated++
      }
    }

    return { processed: brands.length, updated }
  }

  /**
   * Flag brands with stale data (not updated in 90+ days)
   */
  async flagStaleData(): Promise<{ flagged: number }> {
    const supabase = getSupabaseAdmin()
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // Update data_confidence for stale brands
    const { data, error } = await supabase
      .from('brands')
      .update({
        data_confidence: 20 // Low confidence for stale data
      })
      .or(`last_researched_at.is.null,last_researched_at.lt.${ninetyDaysAgo.toISOString()}`)
      .gt('data_confidence', 20)
      .select('id')

    if (error) {
      console.error('Error flagging stale data:', error)
      return { flagged: 0 }
    }

    return { flagged: data?.length || 0 }
  }

  /**
   * Get enrichment stats for admin dashboard
   */
  async getEnrichmentStats(): Promise<{
    totalBrands: number
    verifiedEmails: number
    unverifiedEmails: number
    highConfidence: number
    staleData: number
    pendingRequests: number
  }> {
    const supabase = getSupabaseAdmin()

    const [
      { count: totalBrands },
      { count: verifiedEmails },
      { count: unverifiedEmails },
      { count: highConfidence },
      { count: staleData },
      { count: pendingRequests }
    ] = await Promise.all([
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('brands').select('*', { count: 'exact', head: true }).eq('email_verified', true),
      supabase.from('brands').select('*', { count: 'exact', head: true }).eq('email_verified', false).not('pr_email', 'is', null),
      supabase.from('brands').select('*', { count: 'exact', head: true }).gte('hiring_confidence', 70),
      supabase.from('brands').select('*', { count: 'exact', head: true }).lte('data_confidence', 30),
      supabase.from('brand_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ])

    return {
      totalBrands: totalBrands || 0,
      verifiedEmails: verifiedEmails || 0,
      unverifiedEmails: unverifiedEmails || 0,
      highConfidence: highConfidence || 0,
      staleData: staleData || 0,
      pendingRequests: pendingRequests || 0
    }
  }
}

// Singleton
let enrichmentService: AutoEnrichmentService | null = null

export function getAutoEnrichmentService(): AutoEnrichmentService {
  if (!enrichmentService) {
    enrichmentService = new AutoEnrichmentService()
  }
  return enrichmentService
}
