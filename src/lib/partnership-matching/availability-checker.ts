/**
 * Availability Checker
 * Checks if creators are available for new partnerships
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface CreatorAvailability {
  id: string
  actively_seeking: boolean
  partnership_capacity: number
  current_partnerships: number
  min_budget: number | null
  preferred_campaign_types: string[]
  availability_updated_at: string | null
}

export interface AvailabilityCheckResult {
  isAvailable: boolean
  hasCapacity: boolean
  meetsBudget: boolean
  matchesCampaignType: boolean
  reasons: string[]
}

/**
 * Check if a creator is available for a partnership
 */
export function checkCreatorAvailability(
  creator: CreatorAvailability,
  briefBudgetMin: number | null,
  briefBudgetMax: number | null,
  briefCampaignTypes: string[]
): AvailabilityCheckResult {
  const reasons: string[] = []

  // Check if actively seeking
  const isActivelySeeking = creator.actively_seeking === true
  if (!isActivelySeeking) {
    reasons.push('Creator is not actively seeking partnerships')
  }

  // Check capacity
  const capacity = creator.partnership_capacity || 3
  const current = creator.current_partnerships || 0
  const hasCapacity = current < capacity
  if (!hasCapacity) {
    reasons.push(`Creator at full capacity (${current}/${capacity} partnerships)`)
  }

  // Check budget alignment
  let meetsBudget = true
  if (creator.min_budget && briefBudgetMax) {
    meetsBudget = briefBudgetMax >= creator.min_budget
    if (!meetsBudget) {
      reasons.push(`Budget below creator minimum ($${creator.min_budget})`)
    }
  }

  // Check campaign type preference
  let matchesCampaignType = true
  if (creator.preferred_campaign_types && creator.preferred_campaign_types.length > 0) {
    const hasMatch = briefCampaignTypes.some(type =>
      creator.preferred_campaign_types.includes(type)
    )
    matchesCampaignType = hasMatch
    if (!matchesCampaignType) {
      reasons.push('Campaign type not in creator preferences')
    }
  }

  const isAvailable = isActivelySeeking && hasCapacity && meetsBudget && matchesCampaignType

  return {
    isAvailable,
    hasCapacity,
    meetsBudget,
    matchesCampaignType,
    reasons
  }
}

/**
 * Fetch all available creators from the database
 */
export async function fetchAvailableCreators(
  supabase: SupabaseClient,
  options?: {
    minBudget?: number
    campaignTypes?: string[]
    niches?: string[]
    minFollowers?: number
    maxFollowers?: number
    minEngagementRate?: number
    includeEmbeddings?: boolean
  }
): Promise<CreatorAvailability[]> {
  // Build select columns - include embeddings when needed for semantic matching
  const baseColumns = `
    id,
    actively_seeking,
    partnership_capacity,
    current_partnerships,
    min_budget,
    preferred_campaign_types,
    availability_updated_at,
    full_name,
    instagram_username,
    follower_count,
    engagement_rate,
    niche,
    profile_picture_url
  `

  // Add embedding columns for semantic matching
  const embeddingColumns = options?.includeEmbeddings
    ? `, profile_embedding, dream_brands`
    : ''

  let query = supabase
    .from('profiles')
    .select(baseColumns + embeddingColumns)
    .eq('user_type', 'creator')
    .eq('actively_seeking', true)

  // Filter by follower count
  if (options?.minFollowers) {
    query = query.gte('follower_count', options.minFollowers)
  }
  if (options?.maxFollowers) {
    query = query.lte('follower_count', options.maxFollowers)
  }

  // Filter by engagement rate
  if (options?.minEngagementRate) {
    query = query.gte('engagement_rate', options.minEngagementRate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching available creators:', error)
    return []
  }

  // Cast data to array with proper typing (dynamic select loses type inference)
  const creators = (data || []) as unknown as Array<CreatorAvailability & {
    full_name?: string | null
    instagram_username?: string | null
    follower_count?: number | null
    engagement_rate?: number | null
    niche?: string | null
    profile_picture_url?: string | null
    profile_embedding?: string | null
    dream_brands?: string[] | null
  }>

  // Further filter by capacity (can't do this in SQL easily)
  const availableCreators = creators.filter(creator => {
    const capacity = creator.partnership_capacity || 3
    const current = creator.current_partnerships || 0
    return current < capacity
  })

  // NOTE: We intentionally do NOT filter by niche here.
  // Niche matching is handled by the scoring algorithm in brief-matcher.ts
  // This allows creators with partially matching or related niches to still
  // appear in results, just with a lower match score.

  return availableCreators
}

/**
 * Update creator's current partnership count
 */
export async function updateCreatorPartnershipCount(
  supabase: SupabaseClient,
  creatorId: string,
  increment: boolean = true
): Promise<boolean> {
  // First get current count
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('current_partnerships')
    .eq('id', creatorId)
    .single()

  if (fetchError) {
    console.error('Error fetching creator profile:', fetchError)
    return false
  }

  const currentCount = profile?.current_partnerships || 0
  const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      current_partnerships: newCount,
      updated_at: new Date().toISOString()
    })
    .eq('id', creatorId)

  if (updateError) {
    console.error('Error updating partnership count:', updateError)
    return false
  }

  return true
}
