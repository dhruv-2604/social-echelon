/**
 * Embedding Service for Semantic Matching
 * Uses OpenAI's text-embedding-3-small model for cost-effective embeddings
 *
 * Cost: $0.02 per 1M tokens (~200 tokens per profile = $0.000004 per embedding)
 */

import OpenAI from 'openai'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Embedding dimensions for text-embedding-3-small
const EMBEDDING_DIMENSIONS = 1536

export interface CreatorProfile {
  id: string
  full_name?: string
  bio?: string
  niche?: string
  creator_niches?: string[]
  past_brands?: string[]
  dream_brands?: string[]
  follower_count?: number
  engagement_rate?: number
}

export interface CampaignBrief {
  id: string
  title: string
  description: string
  product_name?: string
  product_description?: string
  target_niches?: string[]
  campaign_type?: string[]
}

/**
 * Generate embedding for any text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text')
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.trim(),
    dimensions: EMBEDDING_DIMENSIONS
  })

  return response.data[0].embedding
}

/**
 * Build text representation of a creator profile for embedding
 * Combines bio, niche, past brands, and other relevant info
 */
export function buildCreatorEmbeddingText(profile: CreatorProfile): string {
  const parts: string[] = []

  // Bio is the primary content
  if (profile.bio) {
    parts.push(profile.bio)
  }

  // Niche information
  if (profile.niche) {
    parts.push(`Niche: ${profile.niche}`)
  }
  if (profile.creator_niches && profile.creator_niches.length > 0) {
    parts.push(`Content areas: ${profile.creator_niches.join(', ')}`)
  }

  // Past brand collaborations (shows experience and style fit)
  if (profile.past_brands && profile.past_brands.length > 0) {
    parts.push(`Past brand collaborations: ${profile.past_brands.join(', ')}`)
  }

  // Dream brands (shows aspirations and style alignment)
  if (profile.dream_brands && profile.dream_brands.length > 0) {
    parts.push(`Interested in working with: ${profile.dream_brands.join(', ')}`)
  }

  // Audience size context
  if (profile.follower_count) {
    const tier = profile.follower_count < 10000 ? 'nano' :
                 profile.follower_count < 50000 ? 'micro' :
                 profile.follower_count < 500000 ? 'mid-tier' : 'macro'
    parts.push(`${tier} creator with ${profile.follower_count.toLocaleString()} followers`)
  }

  return parts.filter(Boolean).join('. ')
}

/**
 * Build text representation of a campaign brief for embedding
 */
export function buildBriefEmbeddingText(brief: CampaignBrief): string {
  const parts: string[] = []

  // Title and description are primary
  parts.push(brief.title)
  parts.push(brief.description)

  // Product info adds context
  if (brief.product_name) {
    parts.push(`Product: ${brief.product_name}`)
  }
  if (brief.product_description) {
    parts.push(brief.product_description)
  }

  // Target niches help with matching
  if (brief.target_niches && brief.target_niches.length > 0) {
    parts.push(`Looking for creators in: ${brief.target_niches.join(', ')}`)
  }

  // Campaign type context
  if (brief.campaign_type && brief.campaign_type.length > 0) {
    parts.push(`Campaign type: ${brief.campaign_type.join(', ')}`)
  }

  return parts.filter(Boolean).join('. ')
}

/**
 * Generate and store embedding for a creator profile
 */
export async function embedCreatorProfile(profileId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Fetch profile data
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, full_name, niche, creator_niches, past_brands, dream_brands, follower_count, engagement_rate')
    .eq('id', profileId)
    .single()

  if (fetchError || !profile) {
    throw new Error(`Failed to fetch profile ${profileId}: ${fetchError?.message}`)
  }

  // Build embedding text
  const embeddingText = buildCreatorEmbeddingText(profile as CreatorProfile)

  if (embeddingText.length < 10) {
    console.log(`Profile ${profileId} has insufficient data for embedding`)
    return
  }

  // Generate embedding
  const embedding = await generateEmbedding(embeddingText)

  // Store embedding in database
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      profile_embedding: JSON.stringify(embedding)
    })
    .eq('id', profileId)

  if (updateError) {
    throw new Error(`Failed to store embedding for profile ${profileId}: ${updateError.message}`)
  }

  console.log(`Generated embedding for profile ${profileId}`)
}

/**
 * Generate and store embedding for a campaign brief
 */
export async function embedCampaignBrief(briefId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Fetch brief data
  const { data: brief, error: fetchError } = await supabase
    .from('campaign_briefs')
    .select('id, title, description, product_name, product_description, target_niches, campaign_type')
    .eq('id', briefId)
    .single()

  if (fetchError || !brief) {
    throw new Error(`Failed to fetch brief ${briefId}: ${fetchError?.message}`)
  }

  // Build embedding text
  const embeddingText = buildBriefEmbeddingText(brief as CampaignBrief)

  // Generate embedding
  const embedding = await generateEmbedding(embeddingText)

  // Store embedding in database
  const { error: updateError } = await supabase
    .from('campaign_briefs')
    .update({
      brief_embedding: JSON.stringify(embedding)
    })
    .eq('id', briefId)

  if (updateError) {
    throw new Error(`Failed to store embedding for brief ${briefId}: ${updateError.message}`)
  }

  console.log(`Generated embedding for brief ${briefId}`)
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between 0 and 1 (1 = identical, 0 = completely different)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Find creators similar to a brief using vector similarity
 * Uses the database function for efficient similarity search
 */
export async function findSimilarCreators(
  briefId: string,
  options: {
    matchThreshold?: number
    matchCount?: number
  } = {}
): Promise<Array<{ creator_id: string; similarity: number }>> {
  const { matchThreshold = 0.7, matchCount = 10 } = options
  const supabase = getSupabaseAdmin()

  // Get brief embedding
  const { data: brief } = await supabase
    .from('campaign_briefs')
    .select('brief_embedding')
    .eq('id', briefId)
    .single()

  if (!brief?.brief_embedding) {
    // Generate embedding if not exists
    await embedCampaignBrief(briefId)
    const { data: updatedBrief } = await supabase
      .from('campaign_briefs')
      .select('brief_embedding')
      .eq('id', briefId)
      .single()

    if (!updatedBrief?.brief_embedding) {
      throw new Error('Failed to generate brief embedding')
    }
  }

  // Use the database function for similarity search
  const { data, error } = await supabase.rpc('find_similar_creators_by_embedding', {
    query_embedding: brief?.brief_embedding,
    match_threshold: matchThreshold,
    match_count: matchCount
  })

  if (error) {
    console.error('Similarity search error:', error)
    return []
  }

  return (data as Array<{ creator_id: string; similarity: number }>) || []
}

/**
 * Batch generate embeddings for all profiles without embeddings
 * Useful for initial data population
 */
export async function backfillProfileEmbeddings(batchSize = 50): Promise<{ processed: number; errors: number }> {
  const supabase = getSupabaseAdmin()

  // Get profiles without embeddings
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .is('profile_embedding', null)
    .eq('user_type', 'creator')
    .limit(batchSize)

  if (error || !profiles) {
    console.error('Failed to fetch profiles for backfill:', error)
    return { processed: 0, errors: 1 }
  }

  let processed = 0
  let errors = 0

  for (const profile of profiles as Array<{ id: string }>) {
    try {
      await embedCreatorProfile(profile.id)
      processed++
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      console.error(`Failed to embed profile ${profile.id}:`, err)
      errors++
    }
  }

  return { processed, errors }
}
