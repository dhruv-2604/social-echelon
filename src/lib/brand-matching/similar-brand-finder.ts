/**
 * Similar Brand Finder
 *
 * When creators provide dream brands, we find similar brands in our database
 * Uses industry, strategy, budget range, and influencer types as similarity signals
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'

interface SimilarBrandResult {
  id: string
  name: string
  industry: string
  similarityScore: number
  matchReason: string
  dreamBrandMatched: string
}

interface BrandRequest {
  brandName: string
  requestedBy: string
  source: 'dream_brand' | 'past_brand'
}

export class SimilarBrandFinder {
  /**
   * Find brands similar to creator's dream brands
   */
  async findSimilarBrands(
    dreamBrands: string[],
    pastBrands: string[],
    userId: string
  ): Promise<{
    similarBrands: SimilarBrandResult[]
    missingBrands: BrandRequest[]
  }> {
    const supabase = getSupabaseAdmin()
    const similarBrands: SimilarBrandResult[] = []
    const missingBrands: BrandRequest[] = []

    // Get all brands from database
    const { data: allBrands, error } = await supabase
      .from('brands')
      .select('id, name, industry, strategy, influencer_types, budget_min, budget_max, ships_to')

    if (error || !allBrands) {
      console.error('Error fetching brands:', error)
      return { similarBrands: [], missingBrands: [] }
    }

    // Process each dream brand
    for (const dreamBrand of dreamBrands) {
      const normalized = dreamBrand.toLowerCase().trim()

      // Check if exact match exists
      const exactMatch = allBrands.find(
        b => (b.name as string).toLowerCase() === normalized
      )

      if (exactMatch) {
        // Find brands similar to this one
        const similar = this.findBrandsSimilarTo(exactMatch, allBrands)
        similarBrands.push(
          ...similar.map(s => ({
            ...s,
            dreamBrandMatched: dreamBrand
          }))
        )
      } else {
        // Brand not in database - add to request queue
        missingBrands.push({
          brandName: dreamBrand,
          requestedBy: userId,
          source: 'dream_brand'
        })

        // Still try to find brands by industry keywords
        const keywordMatches = this.findBrandsByKeywords(dreamBrand, allBrands)
        similarBrands.push(
          ...keywordMatches.map(s => ({
            ...s,
            dreamBrandMatched: dreamBrand
          }))
        )
      }
    }

    // Also check past brands for similar opportunities
    for (const pastBrand of pastBrands) {
      const normalized = pastBrand.toLowerCase().trim()
      const exactMatch = allBrands.find(
        b => (b.name as string).toLowerCase() === normalized
      )

      if (exactMatch) {
        const similar = this.findBrandsSimilarTo(exactMatch, allBrands)
        // Mark these as "worked with similar" for prioritization
        similarBrands.push(
          ...similar.map(s => ({
            ...s,
            matchReason: `Similar to ${pastBrand} (past collaboration)`,
            dreamBrandMatched: pastBrand
          }))
        )
      }
    }

    // Deduplicate and sort by similarity score
    const uniqueBrands = this.deduplicateBrands(similarBrands)
    const sortedBrands = uniqueBrands.sort((a, b) => b.similarityScore - a.similarityScore)

    return {
      similarBrands: sortedBrands.slice(0, 20), // Top 20 similar brands
      missingBrands
    }
  }

  /**
   * Find brands similar to a specific brand
   */
  private findBrandsSimilarTo(
    targetBrand: any,
    allBrands: any[]
  ): Omit<SimilarBrandResult, 'dreamBrandMatched'>[] {
    const results: Omit<SimilarBrandResult, 'dreamBrandMatched'>[] = []

    for (const brand of allBrands) {
      if (brand.id === targetBrand.id) continue

      let score = 0
      const reasons: string[] = []

      // Same industry = 40 points
      if (brand.industry === targetBrand.industry) {
        score += 40
        reasons.push(`Same industry: ${brand.industry}`)
      }

      // Similar strategy = 25 points
      if (brand.strategy && targetBrand.strategy) {
        const strategyMatch = this.calculateTextSimilarity(
          brand.strategy,
          targetBrand.strategy
        )
        if (strategyMatch > 0.3) {
          score += 25 * strategyMatch
          reasons.push('Similar influencer strategy')
        }
      }

      // Similar influencer types = 20 points
      if (brand.influencer_types && targetBrand.influencer_types) {
        const types1 = (brand.influencer_types as string).split('|')
        const types2 = (targetBrand.influencer_types as string).split('|')
        const overlap = types1.filter(t => types2.includes(t)).length
        if (overlap > 0) {
          const overlapScore = overlap / Math.max(types1.length, types2.length)
          score += 20 * overlapScore
          reasons.push('Works with similar creator sizes')
        }
      }

      // Similar budget range = 15 points
      if (brand.budget_min && targetBrand.budget_min) {
        const budgetSimilarity = this.calculateBudgetSimilarity(
          { min: brand.budget_min, max: brand.budget_max },
          { min: targetBrand.budget_min, max: targetBrand.budget_max }
        )
        score += 15 * budgetSimilarity
        if (budgetSimilarity > 0.5) {
          reasons.push('Similar budget range')
        }
      }

      if (score >= 30) {
        results.push({
          id: brand.id,
          name: brand.name,
          industry: brand.industry,
          similarityScore: Math.round(score),
          matchReason: reasons.join(', ')
        })
      }
    }

    return results
  }

  /**
   * Find brands by keyword matching when exact brand not found
   */
  private findBrandsByKeywords(
    brandName: string,
    allBrands: any[]
  ): Omit<SimilarBrandResult, 'dreamBrandMatched'>[] {
    const results: Omit<SimilarBrandResult, 'dreamBrandMatched'>[] = []
    const keywords = this.extractKeywords(brandName)

    // Industry mapping for common brand names
    const industryHints: Record<string, string[]> = {
      glossier: ['Beauty', 'Skincare'],
      fenty: ['Beauty', 'Makeup'],
      patagonia: ['Fashion', 'Outdoor'],
      nike: ['Fashion', 'Fitness', 'Sports'],
      lululemon: ['Fashion', 'Fitness', 'Athleisure'],
      oatly: ['Food & Beverage', 'Plant-based'],
      allbirds: ['Fashion', 'Sustainable'],
      warby: ['Fashion', 'Eyewear'],
      casper: ['Home & Living', 'Sleep'],
      peloton: ['Fitness', 'Technology']
    }

    // Check for industry hints
    const hintKey = Object.keys(industryHints).find(key =>
      brandName.toLowerCase().includes(key)
    )
    const targetIndustries = hintKey ? industryHints[hintKey] : []

    for (const brand of allBrands) {
      let score = 0
      const reasons: string[] = []

      // Industry match from hints
      if (targetIndustries.includes(brand.industry)) {
        score += 35
        reasons.push(`${brand.industry} brand like ${brandName}`)
      }

      // Keyword match in brand name or strategy
      for (const keyword of keywords) {
        if ((brand.name as string).toLowerCase().includes(keyword)) {
          score += 15
        }
        if (brand.strategy && (brand.strategy as string).toLowerCase().includes(keyword)) {
          score += 10
        }
      }

      if (score >= 25) {
        results.push({
          id: brand.id,
          name: brand.name,
          industry: brand.industry,
          similarityScore: Math.round(score),
          matchReason: reasons.join(', ') || `Similar to ${brandName}`
        })
      }
    }

    return results.slice(0, 5) // Max 5 keyword matches per dream brand
  }

  /**
   * Simple text similarity using word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/)
    const words2 = text2.toLowerCase().split(/\s+/)
    const set1 = new Set(words1)
    const set2 = new Set(words2)

    let overlap = 0
    for (const word of set1) {
      if (set2.has(word)) overlap++
    }

    return overlap / Math.max(set1.size, set2.size)
  }

  /**
   * Calculate budget range similarity
   */
  private calculateBudgetSimilarity(
    range1: { min: number; max: number },
    range2: { min: number; max: number }
  ): number {
    const overlap = Math.max(
      0,
      Math.min(range1.max, range2.max) - Math.max(range1.min, range2.min)
    )
    const totalRange = Math.max(range1.max, range2.max) - Math.min(range1.min, range2.min)

    return totalRange > 0 ? overlap / totalRange : 0
  }

  /**
   * Extract meaningful keywords from brand name
   */
  private extractKeywords(brandName: string): string[] {
    const stopWords = ['the', 'and', 'or', 'co', 'inc', 'llc', 'corp']
    return brandName
      .toLowerCase()
      .split(/[\s\-_]+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
  }

  /**
   * Remove duplicate brands, keeping highest score
   */
  private deduplicateBrands(
    brands: SimilarBrandResult[]
  ): SimilarBrandResult[] {
    const seen = new Map<string, SimilarBrandResult>()

    for (const brand of brands) {
      const existing = seen.get(brand.id)
      if (!existing || existing.similarityScore < brand.similarityScore) {
        seen.set(brand.id, brand)
      }
    }

    return Array.from(seen.values())
  }
}

// Singleton
let similarBrandFinder: SimilarBrandFinder | null = null

export function getSimilarBrandFinder(): SimilarBrandFinder {
  if (!similarBrandFinder) {
    similarBrandFinder = new SimilarBrandFinder()
  }
  return similarBrandFinder
}
