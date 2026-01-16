/**
 * Brief Matcher
 * Matches campaign briefs to available creators using hybrid scoring:
 * - Vector similarity for semantic matching (60% weight)
 * - Rule-based criteria matching (40% weight)
 * - Dream brand boost (1.5x multiplier)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { fetchAvailableCreators, checkCreatorAvailability } from './availability-checker'
import {
  generateEmbedding,
  buildBriefEmbeddingText,
  cosineSimilarity
} from '../embeddings/embedding-service'

export interface CampaignBrief {
  id: string
  brand_user_id: string
  title: string
  description: string
  campaign_type: string[]
  target_niches: string[]
  min_followers: number | null
  max_followers: number | null
  min_engagement_rate: number | null
  budget_min: number | null
  budget_max: number | null
  product_name?: string
  product_description?: string
  brief_embedding?: string | null
}

export interface CreatorProfile {
  id: string
  full_name: string | null
  instagram_username: string | null
  follower_count: number | null
  engagement_rate: number | null
  niche: string | null
  profile_picture_url: string | null
  actively_seeking: boolean
  partnership_capacity: number
  current_partnerships: number
  min_budget: number | null
  preferred_campaign_types: string[]
  dream_brands?: string[] | null
  profile_embedding?: string | null
}

export interface MatchResult {
  creatorId: string
  matchScore: number
  matchReasons: {
    nicheMatch: boolean
    followerMatch: boolean
    engagementMatch: boolean
    budgetMatch: boolean
    campaignTypeMatch: boolean
    semanticMatch: boolean
    dreamBrandMatch: boolean
  }
  semanticScore?: number // 0-100 score from vector similarity
  ruleScore?: number // 0-100 score from rule-based matching
  isDreamBrand?: boolean // True if brand is in creator's dream list
  creator: CreatorProfile
}

/**
 * Calculate RULE-BASED match score between a brief and a creator
 * This is the traditional matching (40% of final hybrid score)
 */
export function calculateRuleBasedScore(
  brief: CampaignBrief,
  creator: CreatorProfile
): { score: number; reasons: Omit<MatchResult['matchReasons'], 'semanticMatch' | 'dreamBrandMatch'> } {
  let score = 0
  const reasons = {
    nicheMatch: false,
    followerMatch: false,
    engagementMatch: false,
    budgetMatch: false,
    campaignTypeMatch: false
  }

  // Base score for being available (25 points)
  if (creator.actively_seeking) {
    score += 25
  }

  // Niche match (25 points)
  if (brief.target_niches.length === 0) {
    // No niche requirement = auto match
    score += 25
    reasons.nicheMatch = true
  } else if (creator.niche) {
    const nicheMatch = brief.target_niches.some(targetNiche =>
      creator.niche!.toLowerCase().includes(targetNiche.toLowerCase()) ||
      targetNiche.toLowerCase().includes(creator.niche!.toLowerCase())
    )
    if (nicheMatch) {
      score += 25
      reasons.nicheMatch = true
    }
  }

  // Follower count match (20 points)
  const followerCount = creator.follower_count || 0
  const minFollowers = brief.min_followers || 0
  const maxFollowers = brief.max_followers || Infinity

  if (followerCount >= minFollowers && followerCount <= maxFollowers) {
    score += 20
    reasons.followerMatch = true
  } else if (followerCount >= minFollowers * 0.8 && followerCount <= maxFollowers * 1.2) {
    // Partial match (within 20% tolerance)
    score += 10
    reasons.followerMatch = true
  }

  // Engagement rate match (15 points)
  const engagementRate = creator.engagement_rate || 0
  const minEngagement = brief.min_engagement_rate || 0

  if (engagementRate >= minEngagement) {
    score += 15
    reasons.engagementMatch = true
  } else if (engagementRate >= minEngagement * 0.8) {
    // Within 20% of requirement
    score += 8
    reasons.engagementMatch = true
  }

  // Budget alignment (10 points)
  const creatorMinBudget = creator.min_budget || 0
  const briefMaxBudget = brief.budget_max || Infinity

  if (briefMaxBudget >= creatorMinBudget) {
    score += 10
    reasons.budgetMatch = true
  }

  // Campaign type preference match (5 points)
  if (!creator.preferred_campaign_types || creator.preferred_campaign_types.length === 0) {
    // No preference = matches all
    score += 5
    reasons.campaignTypeMatch = true
  } else {
    const typeMatch = brief.campaign_type.some(type =>
      creator.preferred_campaign_types.includes(type)
    )
    if (typeMatch) {
      score += 5
      reasons.campaignTypeMatch = true
    }
  }

  return { score: Math.min(100, score), reasons }
}

/**
 * Calculate SEMANTIC match score using vector embeddings
 * Returns 0-100 score based on cosine similarity
 */
export function calculateSemanticScore(
  briefEmbedding: number[] | null,
  creatorEmbedding: number[] | null
): number {
  if (!briefEmbedding || !creatorEmbedding) {
    return 0 // No embeddings available
  }

  // Cosine similarity returns 0-1, convert to 0-100
  const similarity = cosineSimilarity(briefEmbedding, creatorEmbedding)

  // Map similarity to score (0.5-1.0 range maps to 0-100)
  // Similarity < 0.5 = poor match, similarity = 1.0 = perfect match
  const normalizedScore = Math.max(0, (similarity - 0.5) * 200)

  return Math.min(100, Math.round(normalizedScore))
}

/**
 * Check if the brand matches any of the creator's dream brands
 */
export function checkDreamBrandMatch(
  brandName: string | undefined,
  dreamBrands: string[] | null | undefined
): boolean {
  if (!brandName || !dreamBrands || dreamBrands.length === 0) {
    return false
  }

  const normalizedBrand = brandName.toLowerCase().trim()

  return dreamBrands.some(dream => {
    const normalizedDream = dream.toLowerCase().trim()
    return normalizedBrand.includes(normalizedDream) ||
           normalizedDream.includes(normalizedBrand)
  })
}

/**
 * Calculate HYBRID match score combining semantic and rule-based scoring
 *
 * Final score = (semantic * 0.6) + (rule * 0.4)
 * If dream brand match: score *= 1.5 (capped at 100)
 */
export function calculateHybridMatchScore(
  brief: CampaignBrief,
  creator: CreatorProfile,
  briefEmbedding: number[] | null,
  brandName?: string
): {
  score: number
  semanticScore: number
  ruleScore: number
  reasons: MatchResult['matchReasons']
  isDreamBrand: boolean
} {
  // Calculate rule-based score (40% weight)
  const { score: ruleScore, reasons: ruleReasons } = calculateRuleBasedScore(brief, creator)

  // Parse creator embedding if it's a string
  let creatorEmbedding: number[] | null = null
  if (creator.profile_embedding) {
    try {
      creatorEmbedding = typeof creator.profile_embedding === 'string'
        ? JSON.parse(creator.profile_embedding)
        : creator.profile_embedding
    } catch {
      creatorEmbedding = null
    }
  }

  // Calculate semantic score (60% weight)
  const semanticScore = calculateSemanticScore(briefEmbedding, creatorEmbedding)
  const hasSemanticMatch = semanticScore > 50 // Above 50 considered a semantic match

  // Check dream brand match
  const isDreamBrand = checkDreamBrandMatch(brandName, creator.dream_brands)

  // Calculate hybrid score
  let hybridScore: number

  if (semanticScore > 0) {
    // Use hybrid scoring: 60% semantic + 40% rule-based
    hybridScore = (semanticScore * 0.6) + (ruleScore * 0.4)
  } else {
    // Fallback to pure rule-based if no embeddings
    hybridScore = ruleScore
  }

  // Apply dream brand boost (1.5x multiplier)
  if (isDreamBrand) {
    hybridScore = hybridScore * 1.5
  }

  // Cap at 100
  hybridScore = Math.min(100, Math.round(hybridScore))

  return {
    score: hybridScore,
    semanticScore,
    ruleScore,
    reasons: {
      ...ruleReasons,
      semanticMatch: hasSemanticMatch,
      dreamBrandMatch: isDreamBrand
    },
    isDreamBrand
  }
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use calculateHybridMatchScore instead
 */
export function calculateMatchScore(
  brief: CampaignBrief,
  creator: CreatorProfile
): { score: number; reasons: MatchResult['matchReasons'] } {
  const { score: ruleScore, reasons } = calculateRuleBasedScore(brief, creator)
  return {
    score: ruleScore,
    reasons: {
      ...reasons,
      semanticMatch: false,
      dreamBrandMatch: false
    }
  }
}

/**
 * Match a brief to all available creators using hybrid scoring
 */
export async function matchBriefToCreators(
  supabase: SupabaseClient,
  brief: CampaignBrief,
  options?: {
    minMatchScore?: number
    maxMatches?: number
    useSemanticMatching?: boolean
    brandName?: string
  }
): Promise<MatchResult[]> {
  // During development: show all matches with their scores (minScore = 0)
  // For production: set to 50+ to only show quality matches
  const minScore = options?.minMatchScore || 0
  const maxMatches = options?.maxMatches || 50
  const useSemanticMatching = options?.useSemanticMatching !== false // Default true

  // Get brand name for dream brand matching if not provided
  let brandName = options?.brandName
  if (!brandName) {
    const { data: brandProfile } = await supabase
      .from('brand_profiles')
      .select('company_name')
      .eq('user_id', brief.brand_user_id)
      .single()
    brandName = (brandProfile as any)?.company_name || undefined
  }

  // Parse or generate brief embedding for semantic matching
  let briefEmbedding: number[] | null = null

  if (useSemanticMatching) {
    // First try to use existing embedding
    if (brief.brief_embedding) {
      try {
        briefEmbedding = typeof brief.brief_embedding === 'string'
          ? JSON.parse(brief.brief_embedding)
          : brief.brief_embedding
      } catch {
        briefEmbedding = null
      }
    }

    // Generate embedding if not available
    if (!briefEmbedding) {
      try {
        const embeddingText = buildBriefEmbeddingText({
          id: brief.id,
          title: brief.title,
          description: brief.description,
          product_name: brief.product_name,
          product_description: brief.product_description,
          target_niches: brief.target_niches,
          campaign_type: brief.campaign_type
        })
        briefEmbedding = await generateEmbedding(embeddingText)

        // Store the embedding for future use
        await supabase
          .from('campaign_briefs')
          .update({ brief_embedding: JSON.stringify(briefEmbedding) })
          .eq('id', brief.id)
      } catch (error) {
        console.warn('Failed to generate brief embedding, falling back to rule-based:', error)
        briefEmbedding = null
      }
    }
  }

  // Fetch all potentially matching creators (including embeddings and dream_brands)
  const creators = await fetchAvailableCreators(supabase, {
    minBudget: brief.budget_max || undefined,
    campaignTypes: brief.campaign_type,
    niches: brief.target_niches.length > 0 ? brief.target_niches : undefined,
    minFollowers: brief.min_followers || undefined,
    maxFollowers: brief.max_followers || undefined,
    minEngagementRate: brief.min_engagement_rate || undefined,
    includeEmbeddings: useSemanticMatching
  })

  // Calculate match scores for each creator
  const matches: MatchResult[] = []

  for (const creator of creators) {
    // Double-check availability
    const availability = checkCreatorAvailability(
      creator,
      brief.budget_min,
      brief.budget_max,
      brief.campaign_type
    )

    if (!availability.isAvailable) {
      continue
    }

    // Calculate hybrid match score
    const {
      score,
      semanticScore,
      ruleScore,
      reasons,
      isDreamBrand
    } = calculateHybridMatchScore(
      brief,
      creator as unknown as CreatorProfile,
      briefEmbedding,
      brandName
    )

    if (score >= minScore) {
      matches.push({
        creatorId: creator.id,
        matchScore: score,
        matchReasons: reasons,
        semanticScore,
        ruleScore,
        isDreamBrand,
        creator: creator as unknown as CreatorProfile
      })
    }
  }

  // Sort by match score (highest first) and limit results
  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxMatches)
}

/**
 * Save matches to the database
 */
export async function saveBriefMatches(
  supabase: SupabaseClient,
  briefId: string,
  matches: MatchResult[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (matches.length === 0) {
    return { success: true, count: 0 }
  }

  const matchRecords = matches.map(match => ({
    brief_id: briefId,
    creator_user_id: match.creatorId,
    match_score: match.matchScore,
    match_reasons: {
      ...match.matchReasons,
      // Include scoring breakdown for transparency
      semantic_score: match.semanticScore,
      rule_score: match.ruleScore,
      is_dream_brand: match.isDreamBrand,
      match_tier: getMatchTier(match.matchScore)
    },
    creator_response: 'pending',
    partnership_status: 'matching',
    created_at: new Date().toISOString()
  }))

  const { error } = await supabase
    .from('brief_matches')
    .insert(matchRecords)

  if (error) {
    console.error('Error saving brief matches:', error)
    return { success: false, count: 0, error: error.message }
  }

  return { success: true, count: matches.length }
}

/**
 * Main function to process a new brief and create matches
 */
export async function processBriefMatching(
  supabase: SupabaseClient,
  briefId: string
): Promise<{ success: boolean; matchCount: number; error?: string }> {
  // Fetch the brief
  const { data: brief, error: briefError } = await supabase
    .from('campaign_briefs')
    .select('*')
    .eq('id', briefId)
    .single()

  if (briefError || !brief) {
    console.error('Error fetching brief:', briefError)
    return { success: false, matchCount: 0, error: 'Brief not found' }
  }

  // Skip if brief is not active
  if (brief.status !== 'active') {
    return { success: false, matchCount: 0, error: 'Brief is not active' }
  }

  // Find matching creators
  const matches = await matchBriefToCreators(supabase, brief as CampaignBrief)

  console.log(`Found ${matches.length} potential matches for brief ${briefId}`)

  // Save matches to database
  const saveResult = await saveBriefMatches(supabase, briefId, matches)

  if (!saveResult.success) {
    return { success: false, matchCount: 0, error: saveResult.error }
  }

  // TODO: Trigger notifications to matched creators (Phase 3.5)
  // await notifyMatchedCreators(supabase, briefId, matches)

  return { success: true, matchCount: saveResult.count }
}

/**
 * Golden Matches Configuration
 * Golden matches have score >= 85% - these are high-quality matches
 */
export const GOLDEN_MATCH_CONFIG = {
  MIN_SCORE: 85
}

/**
 * Filter matches to only include "Golden Matches"
 * Golden Matches are high-quality matches (score >= 85%)
 *
 * Note: In production, you may want to limit to top 3 to reduce choice paralysis
 * For now, returning all golden matches for dev/testing purposes
 */
export function filterGoldenMatches(matches: MatchResult[]): MatchResult[] {
  return matches.filter(m => m.matchScore >= GOLDEN_MATCH_CONFIG.MIN_SCORE)
}

/**
 * Check if a match qualifies as a "Golden Match"
 */
export function isGoldenMatch(match: MatchResult): boolean {
  return match.matchScore >= GOLDEN_MATCH_CONFIG.MIN_SCORE
}

/**
 * Get match quality tier
 * Used for displaying appropriate UI badges
 */
export function getMatchTier(score: number): 'golden' | 'great' | 'good' | 'fair' {
  if (score >= 85) return 'golden'   // ⭐ Golden Match - Top tier
  if (score >= 70) return 'great'    // 💚 Great Match
  if (score >= 50) return 'good'     // 👍 Good Match
  return 'fair'                       // 🤷 Fair Match
}

/**
 * Generate human-readable match description
 */
export function getMatchDescription(match: MatchResult): string {
  const parts: string[] = []

  if (match.isDreamBrand) {
    parts.push('This is a dream brand for you!')
  }

  if (match.matchReasons.semanticMatch) {
    parts.push('Great content fit based on your style')
  }

  if (match.matchReasons.nicheMatch) {
    parts.push('Matches your niche')
  }

  if (match.matchReasons.engagementMatch) {
    parts.push('Your engagement rate meets requirements')
  }

  if (match.matchReasons.budgetMatch) {
    parts.push('Budget aligns with your expectations')
  }

  if (parts.length === 0) {
    parts.push('Potential match based on your profile')
  }

  return parts.join('. ')
}
