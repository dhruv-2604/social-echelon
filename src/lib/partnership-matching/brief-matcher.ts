/**
 * Brief Matcher
 * Matches campaign briefs to available creators based on criteria
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { fetchAvailableCreators, checkCreatorAvailability } from './availability-checker'

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
  }
  creator: CreatorProfile
}

/**
 * Calculate match score between a brief and a creator
 */
export function calculateMatchScore(
  brief: CampaignBrief,
  creator: CreatorProfile
): { score: number; reasons: MatchResult['matchReasons'] } {
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
 * Match a brief to all available creators
 */
export async function matchBriefToCreators(
  supabase: SupabaseClient,
  brief: CampaignBrief,
  options?: {
    minMatchScore?: number
    maxMatches?: number
  }
): Promise<MatchResult[]> {
  const minScore = options?.minMatchScore || 50
  const maxMatches = options?.maxMatches || 50

  // Fetch all potentially matching creators
  const creators = await fetchAvailableCreators(supabase, {
    minBudget: brief.budget_max || undefined,
    campaignTypes: brief.campaign_type,
    niches: brief.target_niches.length > 0 ? brief.target_niches : undefined,
    minFollowers: brief.min_followers || undefined,
    maxFollowers: brief.max_followers || undefined,
    minEngagementRate: brief.min_engagement_rate || undefined
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

    // Calculate match score
    const { score, reasons } = calculateMatchScore(brief, creator as unknown as CreatorProfile)

    if (score >= minScore) {
      matches.push({
        creatorId: creator.id,
        matchScore: score,
        matchReasons: reasons,
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
    match_reasons: match.matchReasons,
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
