/**
 * Email Verification Service
 *
 * Uses Hunter.io API to verify brand contact emails
 * Falls back to pattern-based guessing with lower confidence
 *
 * Wellness mission: Don't let creators waste time emailing dead addresses
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'

interface HunterEmailVerifyResponse {
  data: {
    email: string
    result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown'
    score: number
    regexp: boolean
    gibberish: boolean
    disposable: boolean
    webmail: boolean
    mx_records: boolean
    smtp_server: boolean
    smtp_check: boolean
    accept_all: boolean
  }
}

interface EmailVerificationResult {
  email: string
  verified: boolean
  confidence: number // 0-100
  source: 'hunter' | 'pattern' | 'manual'
  contactName?: string
  contactRole?: string
  error?: string
}

export class EmailVerificationService {
  private apiKey: string
  private baseUrl = 'https://api.hunter.io/v2'

  constructor() {
    this.apiKey = process.env.HUNTER_API_KEY || ''
  }

  /**
   * Find and verify email for a brand
   * Returns verified email or best guess with confidence score
   */
  async findAndVerifyBrandEmail(
    brandName: string,
    website?: string,
    instagramHandle?: string
  ): Promise<EmailVerificationResult> {
    // If no API key, fall back to pattern matching
    if (!this.apiKey) {
      return this.generatePatternEmail(brandName, website)
    }

    try {
      // Step 1: Extract domain from website or guess from brand name
      const domain = this.extractDomain(website, brandName)

      if (!domain) {
        return this.generatePatternEmail(brandName, website)
      }

      // Step 2: Try to find PR/Marketing contact via Hunter
      const prEmail = await this.findPRContact(domain)

      if (prEmail) {
        // Step 3: Verify the found email
        const verification = await this.verifyEmail(prEmail.email)

        if (verification.verified) {
          return {
            email: prEmail.email,
            verified: true,
            confidence: Math.min(100, verification.confidence + 20),
            source: 'hunter',
            contactName: prEmail.contactName,
            contactRole: prEmail.contactRole
          }
        }
      }

      // Step 4: Try common PR email patterns
      const commonPatterns = [
        `pr@${domain}`,
        `press@${domain}`,
        `partnerships@${domain}`,
        `influencer@${domain}`,
        `collab@${domain}`,
        `marketing@${domain}`,
        `hello@${domain}`
      ]

      for (const pattern of commonPatterns) {
        const verification = await this.verifyEmail(pattern)
        if (verification.verified && verification.confidence >= 70) {
          return {
            email: pattern,
            verified: true,
            confidence: verification.confidence,
            source: 'hunter'
          }
        }
      }

      // Fall back to pattern with low confidence
      return this.generatePatternEmail(brandName, website)

    } catch (error) {
      console.error('Email verification error:', error)
      return this.generatePatternEmail(brandName, website)
    }
  }

  /**
   * Find PR/Marketing contact for a domain
   */
  private async findPRContact(domain: string): Promise<{
    email: string
    contactName?: string
    contactRole?: string
  } | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/domain-search?domain=${domain}&department=marketing&api_key=${this.apiKey}`
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()

      const prKeywords = ['pr', 'press', 'marketing', 'influencer', 'partnership', 'brand', 'collab']
      const emails = data.data?.emails || []

      for (const emailData of emails) {
        const position = (emailData.position || '').toLowerCase()
        const department = (emailData.department || '').toLowerCase()

        if (prKeywords.some(kw => position.includes(kw) || department.includes(kw))) {
          return {
            email: emailData.value,
            contactName: [emailData.first_name, emailData.last_name].filter(Boolean).join(' '),
            contactRole: emailData.position
          }
        }
      }

      const marketingEmail = emails.find((e: any) =>
        e.department?.toLowerCase() === 'marketing'
      )

      if (marketingEmail) {
        return {
          email: marketingEmail.value,
          contactName: [marketingEmail.first_name, marketingEmail.last_name].filter(Boolean).join(' '),
          contactRole: marketingEmail.position
        }
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Verify a specific email address
   */
  async verifyEmail(email: string): Promise<{ verified: boolean; confidence: number }> {
    if (!this.apiKey) {
      return { verified: false, confidence: 0 }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/email-verifier?email=${encodeURIComponent(email)}&api_key=${this.apiKey}`
      )

      if (!response.ok) {
        return { verified: false, confidence: 0 }
      }

      const data: HunterEmailVerifyResponse = await response.json()

      const verified = data.data.result === 'deliverable'
      const confidence = data.data.score

      return { verified, confidence }
    } catch {
      return { verified: false, confidence: 0 }
    }
  }

  /**
   * Generate pattern-based email (fallback when no API)
   */
  private generatePatternEmail(brandName: string, website?: string): EmailVerificationResult {
    const domain = this.extractDomain(website, brandName)

    if (!domain) {
      const cleanName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '')
      return {
        email: `partnerships@${cleanName}.com`,
        verified: false,
        confidence: 10,
        source: 'pattern',
        error: 'Could not determine domain, using guess'
      }
    }

    return {
      email: `partnerships@${domain}`,
      verified: false,
      confidence: 30,
      source: 'pattern'
    }
  }

  /**
   * Extract domain from website URL or brand name
   */
  private extractDomain(website?: string, brandName?: string): string | null {
    if (website) {
      try {
        const url = new URL(website.startsWith('http') ? website : `https://${website}`)
        return url.hostname.replace('www.', '')
      } catch {
        if (website.includes('.')) {
          return website.replace('www.', '')
        }
      }
    }

    if (brandName) {
      const cleanName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '')
      return `${cleanName}.com`
    }

    return null
  }

  /**
   * Batch verify emails for multiple brands
   */
  async batchVerifyBrands(brandIds: string[]): Promise<Map<string, EmailVerificationResult>> {
    const supabase = getSupabaseAdmin()
    const results = new Map<string, EmailVerificationResult>()

    const { data: brands } = await supabase
      .from('brands')
      .select('id, name, website, instagram_handle, pr_email, email_verified')
      .in('id', brandIds)

    if (!brands) return results

    for (const brand of brands) {
      if ((brand as any).email_verified && (brand as any).pr_email) {
        results.set(brand.id as string, {
          email: (brand as any).pr_email,
          verified: true,
          confidence: 90,
          source: 'manual'
        })
        continue
      }

      const result = await this.findAndVerifyBrandEmail(
        brand.name as string,
        brand.website as string,
        (brand as any).instagram_handle
      )

      results.set(brand.id as string, result)

      await supabase
        .from('brands')
        .update({
          pr_email: result.email,
          email_verified: result.verified,
          email_verified_at: result.verified ? new Date().toISOString() : null,
          email_verification_source: result.source,
          contact_name: result.contactName || null,
          contact_role: result.contactRole || null,
          data_confidence: result.confidence
        })
        .eq('id', brand.id)

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return results
  }
}

// Singleton
let emailVerificationService: EmailVerificationService | null = null

export function getEmailVerificationService(): EmailVerificationService {
  if (!emailVerificationService) {
    emailVerificationService = new EmailVerificationService()
  }
  return emailVerificationService
}
