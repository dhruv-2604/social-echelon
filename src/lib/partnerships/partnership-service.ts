/**
 * Partnership Service
 *
 * Manages the lifecycle of brand-creator partnerships from creation to completion.
 * Tracks deliverables, content submission, payments, and wellness metrics.
 *
 * Partnership Lifecycle:
 * 1. Creator says "Yes" to brief → Partnership created (status: 'negotiating')
 * 2. Terms agreed → Status: 'active'
 * 3. Creator submits content → Status: 'content_pending'
 * 4. Brand reviews → Status: 'review'
 * 5. Brand approves + pays → Status: 'completed'
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { updateCreatorPartnershipCount } from '@/lib/partnership-matching/availability-checker'

// ============================================================================
// Types
// ============================================================================

export type PartnershipStatus =
  | 'negotiating'
  | 'active'
  | 'content_pending'
  | 'review'
  | 'completed'
  | 'cancelled'

export interface Deliverable {
  id: string
  type: 'post' | 'story' | 'reel' | 'ugc' | 'other'
  description?: string
  quantity: number
  completed: number
  dueDate?: string
}

export interface Partnership {
  id: string
  briefMatchId: string | null
  brandUserId: string
  creatorUserId: string
  agreedRate: number | null
  deliverables: Deliverable[]
  contentSubmittedAt: string | null
  contentApprovedAt: string | null
  paymentSentAt: string | null
  completedAt: string | null
  brandRating: number | null
  creatorRating: number | null
  wellnessNotes: string | null
  status: PartnershipStatus
  createdAt: string
  updatedAt: string
}

export interface PartnershipWithDetails extends Partnership {
  brand?: {
    id: string
    fullName: string | null
    email: string
    companyName?: string
    logoUrl?: string
  }
  creator?: {
    id: string
    fullName: string | null
    email: string
    instagramUsername?: string
    profilePictureUrl?: string
  }
  briefTitle?: string
}

export interface CreatePartnershipParams {
  briefMatchId?: string
  brandUserId: string
  creatorUserId: string
  agreedRate?: number
  deliverables?: Deliverable[]
}

export interface PartnershipHealthMetrics {
  daysActive: number
  deliverableProgress: number // 0-100 percentage
  communicationScore: number | null // From relay metrics
  onTimeDelivery: boolean | null
  overallHealth: 'healthy' | 'at_risk' | 'needs_attention'
  healthReasons: string[]
}

// ============================================================================
// Core CRUD Operations
// ============================================================================

/**
 * Create a new partnership
 * Called when a creator accepts a brief opportunity
 */
export async function createPartnership(
  params: CreatePartnershipParams
): Promise<{ success: boolean; partnership?: Partnership; error?: string }> {
  const supabase = getSupabaseAdmin()

  try {
    // Generate unique IDs for deliverables
    const deliverables = (params.deliverables || []).map((d, index) => ({
      ...d,
      id: d.id || `del-${Date.now()}-${index}`,
      completed: d.completed || 0
    }))

    const { data, error } = await supabase
      .from('partnerships')
      .insert({
        brief_match_id: params.briefMatchId || null,
        brand_user_id: params.brandUserId,
        creator_user_id: params.creatorUserId,
        agreed_rate: params.agreedRate || null,
        deliverables: deliverables,
        status: 'negotiating'
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating partnership:', error)
      return { success: false, error: error.message }
    }

    // Increment creator's partnership count
    await updateCreatorPartnershipCount(supabase, params.creatorUserId, true)

    return {
      success: true,
      partnership: mapDatabaseToPartnership(data)
    }
  } catch (error) {
    console.error('Create partnership error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get a partnership by ID
 */
export async function getPartnership(
  partnershipId: string
): Promise<Partnership | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('partnerships')
    .select('*')
    .eq('id', partnershipId)
    .single()

  if (error || !data) {
    return null
  }

  return mapDatabaseToPartnership(data)
}

/**
 * Get a partnership with full details (brand, creator, brief info)
 */
export async function getPartnershipWithDetails(
  partnershipId: string
): Promise<PartnershipWithDetails | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('partnerships')
    .select(`
      *,
      brand:profiles!partnerships_brand_user_id_fkey(
        id, full_name, email
      ),
      creator:profiles!partnerships_creator_user_id_fkey(
        id, full_name, email, instagram_username, profile_picture_url
      ),
      brief_match:brief_matches(
        id,
        brief:campaign_briefs(title)
      )
    `)
    .eq('id', partnershipId)
    .single()

  if (error || !data) {
    console.error('Error fetching partnership details:', error)
    return null
  }

  // Type the joined data
  interface PartnershipJoinedData {
    id: string
    brief_match_id: string | null
    brand_user_id: string
    creator_user_id: string
    agreed_rate: number | null
    deliverables: Deliverable[]
    content_submitted_at: string | null
    content_approved_at: string | null
    payment_sent_at: string | null
    completed_at: string | null
    brand_rating: number | null
    creator_rating: number | null
    wellness_notes: string | null
    status: string
    created_at: string
    updated_at: string
    brand: {
      id: string
      full_name: string | null
      email: string
    } | null
    creator: {
      id: string
      full_name: string | null
      email: string
      instagram_username: string | null
      profile_picture_url: string | null
    } | null
    brief_match: {
      id: string
      brief: { title: string } | null
    } | null
  }

  const row = data as unknown as PartnershipJoinedData
  const partnership = mapDatabaseToPartnership(row as unknown as Record<string, unknown>)

  // Get brand profile for company info
  let brandDetails = null
  if (row.brand) {
    const { data: brandProfile } = await supabase
      .from('brand_profiles')
      .select('company_name, logo_url')
      .eq('user_id', row.brand_user_id)
      .single()

    const bp = brandProfile as { company_name: string; logo_url: string | null } | null

    brandDetails = {
      id: row.brand.id,
      fullName: row.brand.full_name,
      email: row.brand.email,
      companyName: bp?.company_name,
      logoUrl: bp?.logo_url || undefined
    }
  }

  return {
    ...partnership,
    brand: brandDetails || undefined,
    creator: row.creator ? {
      id: row.creator.id,
      fullName: row.creator.full_name,
      email: row.creator.email,
      instagramUsername: row.creator.instagram_username || undefined,
      profilePictureUrl: row.creator.profile_picture_url || undefined
    } : undefined,
    briefTitle: row.brief_match?.brief?.title
  }
}

/**
 * Get all partnerships for a user (brand or creator)
 */
export async function getPartnershipsByUser(
  userId: string,
  userType: 'brand' | 'creator',
  options?: {
    status?: PartnershipStatus | PartnershipStatus[]
    limit?: number
    offset?: number
  }
): Promise<PartnershipWithDetails[]> {
  const supabase = getSupabaseAdmin()

  const column = userType === 'brand' ? 'brand_user_id' : 'creator_user_id'

  let query = supabase
    .from('partnerships')
    .select(`
      *,
      brand:profiles!partnerships_brand_user_id_fkey(
        id, full_name, email
      ),
      creator:profiles!partnerships_creator_user_id_fkey(
        id, full_name, email, instagram_username, profile_picture_url
      ),
      brief_match:brief_matches(
        id,
        brief:campaign_briefs(title)
      )
    `)
    .eq(column, userId)
    .order('created_at', { ascending: false })

  // Filter by status
  if (options?.status) {
    if (Array.isArray(options.status)) {
      query = query.in('status', options.status)
    } else {
      query = query.eq('status', options.status)
    }
  }

  // Pagination
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetching partnerships:', error)
    return []
  }

  // Type the result rows
  interface PartnershipRow {
    id: string
    brief_match_id: string | null
    brand_user_id: string
    creator_user_id: string
    agreed_rate: number | null
    deliverables: Deliverable[]
    content_submitted_at: string | null
    content_approved_at: string | null
    payment_sent_at: string | null
    completed_at: string | null
    brand_rating: number | null
    creator_rating: number | null
    wellness_notes: string | null
    status: string
    created_at: string
    updated_at: string
    brand: { id: string; full_name: string | null; email: string } | null
    creator: {
      id: string
      full_name: string | null
      email: string
      instagram_username: string | null
      profile_picture_url: string | null
    } | null
    brief_match: { id: string; brief: { title: string } | null } | null
  }

  const rows = data as unknown as PartnershipRow[]

  return rows.map(row => {
    const partnership = mapDatabaseToPartnership(row as unknown as Record<string, unknown>)
    return {
      ...partnership,
      brand: row.brand ? {
        id: row.brand.id,
        fullName: row.brand.full_name,
        email: row.brand.email
      } : undefined,
      creator: row.creator ? {
        id: row.creator.id,
        fullName: row.creator.full_name,
        email: row.creator.email,
        instagramUsername: row.creator.instagram_username || undefined,
        profilePictureUrl: row.creator.profile_picture_url || undefined
      } : undefined,
      briefTitle: row.brief_match?.brief?.title
    }
  })
}

/**
 * Get partnership by brief match ID
 */
export async function getPartnershipByMatchId(
  matchId: string
): Promise<Partnership | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('partnerships')
    .select('*')
    .eq('brief_match_id', matchId)
    .single()

  if (error || !data) {
    return null
  }

  return mapDatabaseToPartnership(data)
}

// ============================================================================
// Status Management
// ============================================================================

/**
 * Update partnership status with proper state transitions
 */
export async function updatePartnershipStatus(
  partnershipId: string,
  newStatus: PartnershipStatus,
  options?: {
    wellnessNotes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin()

  // Get current partnership
  const current = await getPartnership(partnershipId)
  if (!current) {
    return { success: false, error: 'Partnership not found' }
  }

  // Validate state transition
  const validTransitions: Record<PartnershipStatus, PartnershipStatus[]> = {
    negotiating: ['active', 'cancelled'],
    active: ['content_pending', 'cancelled'],
    content_pending: ['review', 'active', 'cancelled'],
    review: ['completed', 'content_pending', 'cancelled'],
    completed: [], // Terminal state
    cancelled: []  // Terminal state
  }

  if (!validTransitions[current.status].includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from '${current.status}' to '${newStatus}'`
    }
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString()
  }

  // Add wellness notes if provided
  if (options?.wellnessNotes) {
    updateData.wellness_notes = options.wellnessNotes
  }

  // Handle terminal states
  if (newStatus === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  if (newStatus === 'cancelled') {
    // Decrement creator's partnership count
    await updateCreatorPartnershipCount(supabase, current.creatorUserId, false)
  }

  const { error } = await supabase
    .from('partnerships')
    .update(updateData)
    .eq('id', partnershipId)

  if (error) {
    console.error('Error updating partnership status:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================================
// Deliverables Management
// ============================================================================

/**
 * Update partnership deliverables
 */
export async function updateDeliverables(
  partnershipId: string,
  deliverables: Deliverable[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin()

  // Ensure all deliverables have IDs
  const processedDeliverables = deliverables.map((d, index) => ({
    ...d,
    id: d.id || `del-${Date.now()}-${index}`
  }))

  const { error } = await supabase
    .from('partnerships')
    .update({
      deliverables: processedDeliverables,
      updated_at: new Date().toISOString()
    })
    .eq('id', partnershipId)

  if (error) {
    console.error('Error updating deliverables:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Mark a specific deliverable as completed
 */
export async function markDeliverableComplete(
  partnershipId: string,
  deliverableId: string,
  completedCount?: number
): Promise<{ success: boolean; error?: string }> {
  const partnership = await getPartnership(partnershipId)
  if (!partnership) {
    return { success: false, error: 'Partnership not found' }
  }

  const updatedDeliverables = partnership.deliverables.map(d => {
    if (d.id === deliverableId) {
      const newCompleted = completedCount !== undefined
        ? completedCount
        : d.quantity // Mark all as completed
      return { ...d, completed: Math.min(newCompleted, d.quantity) }
    }
    return d
  })

  return updateDeliverables(partnershipId, updatedDeliverables)
}

// ============================================================================
// Content & Payment Tracking
// ============================================================================

/**
 * Mark content as submitted by creator
 */
export async function submitContent(
  partnershipId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin()

  // First update status
  const statusResult = await updatePartnershipStatus(partnershipId, 'content_pending')
  if (!statusResult.success) {
    return statusResult
  }

  const { error } = await supabase
    .from('partnerships')
    .update({
      content_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', partnershipId)

  if (error) {
    console.error('Error marking content submitted:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Brand approves submitted content
 */
export async function approveContent(
  partnershipId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin()

  // Update status to review
  const statusResult = await updatePartnershipStatus(partnershipId, 'review')
  if (!statusResult.success) {
    return statusResult
  }

  const { error } = await supabase
    .from('partnerships')
    .update({
      content_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', partnershipId)

  if (error) {
    console.error('Error approving content:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Mark payment as sent
 */
export async function markPaymentSent(
  partnershipId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('partnerships')
    .update({
      payment_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', partnershipId)

  if (error) {
    console.error('Error marking payment sent:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Complete a partnership
 */
export async function completePartnership(
  partnershipId: string,
  options?: {
    brandRating?: number
    creatorRating?: number
    wellnessNotes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin()

  // Get current partnership to decrement count
  const partnership = await getPartnership(partnershipId)
  if (!partnership) {
    return { success: false, error: 'Partnership not found' }
  }

  const updateData: Record<string, unknown> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (options?.brandRating !== undefined) {
    if (options.brandRating < 1 || options.brandRating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' }
    }
    updateData.brand_rating = options.brandRating
  }

  if (options?.creatorRating !== undefined) {
    if (options.creatorRating < 1 || options.creatorRating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' }
    }
    updateData.creator_rating = options.creatorRating
  }

  if (options?.wellnessNotes) {
    updateData.wellness_notes = options.wellnessNotes
  }

  const { error } = await supabase
    .from('partnerships')
    .update(updateData)
    .eq('id', partnershipId)

  if (error) {
    console.error('Error completing partnership:', error)
    return { success: false, error: error.message }
  }

  // Decrement creator's active partnership count
  await updateCreatorPartnershipCount(supabase, partnership.creatorUserId, false)

  return { success: true }
}

// ============================================================================
// Ratings
// ============================================================================

/**
 * Rate a partnership (brand rates creator or creator rates brand)
 */
export async function ratePartnership(
  partnershipId: string,
  ratingType: 'brand' | 'creator',
  rating: number
): Promise<{ success: boolean; error?: string }> {
  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' }
  }

  const supabase = getSupabaseAdmin()

  // brand_rating = creator rates the brand experience
  // creator_rating = brand rates the creator
  const column = ratingType === 'brand' ? 'brand_rating' : 'creator_rating'

  const { error } = await supabase
    .from('partnerships')
    .update({
      [column]: rating,
      updated_at: new Date().toISOString()
    })
    .eq('id', partnershipId)

  if (error) {
    console.error('Error rating partnership:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================================
// Wellness & Health Metrics
// ============================================================================

/**
 * Calculate partnership health metrics
 */
export async function getPartnershipHealth(
  partnershipId: string
): Promise<PartnershipHealthMetrics | null> {
  const partnership = await getPartnership(partnershipId)
  if (!partnership) {
    return null
  }

  const healthReasons: string[] = []
  let overallHealth: 'healthy' | 'at_risk' | 'needs_attention' = 'healthy'

  // Calculate days active
  const createdAt = new Date(partnership.createdAt)
  const now = new Date()
  const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

  // Calculate deliverable progress
  let deliverableProgress = 0
  if (partnership.deliverables.length > 0) {
    const totalItems = partnership.deliverables.reduce((sum, d) => sum + d.quantity, 0)
    const completedItems = partnership.deliverables.reduce((sum, d) => sum + d.completed, 0)
    deliverableProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  }

  // Check for overdue deliverables
  let onTimeDelivery: boolean | null = null
  const overdueDeliverables = partnership.deliverables.filter(d => {
    if (d.dueDate && d.completed < d.quantity) {
      return new Date(d.dueDate) < now
    }
    return false
  })

  if (overdueDeliverables.length > 0) {
    onTimeDelivery = false
    healthReasons.push(`${overdueDeliverables.length} overdue deliverable(s)`)
    overallHealth = 'at_risk'
  } else if (partnership.deliverables.some(d => d.dueDate)) {
    onTimeDelivery = true
  }

  // Check partnership age vs status
  if (partnership.status === 'negotiating' && daysActive > 7) {
    healthReasons.push('Partnership still in negotiation after 7+ days')
    overallHealth = 'needs_attention'
  }

  if (partnership.status === 'active' && daysActive > 30 && deliverableProgress < 50) {
    healthReasons.push('Low deliverable progress after 30+ days')
    overallHealth = 'at_risk'
  }

  // Check for stalled content review
  if (partnership.status === 'content_pending' && partnership.contentSubmittedAt) {
    const submittedAt = new Date(partnership.contentSubmittedAt)
    const daysSinceSubmission = Math.floor((now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceSubmission > 5) {
      healthReasons.push('Content pending review for 5+ days')
      overallHealth = 'needs_attention'
    }
  }

  // Get communication metrics from relay if available
  let communicationScore: number | null = null
  if (partnership.briefMatchId) {
    const supabase = getSupabaseAdmin()
    const { data: relayData } = await supabase
      .from('message_relays')
      .select('id')
      .eq('brief_match_id', partnership.briefMatchId)
      .single()

    const relay = relayData as { id: string } | null

    if (relay) {
      const { data: messagesData } = await supabase
        .from('relayed_messages')
        .select('response_time_minutes')
        .eq('relay_id', relay.id)

      const messages = messagesData as { response_time_minutes: number | null }[] | null

      if (messages && messages.length > 0) {
        const responseTimes = messages
          .filter(m => m.response_time_minutes !== null)
          .map(m => m.response_time_minutes as number)

        if (responseTimes.length > 0) {
          const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          // Score: 100 if < 1 hour, scales down to 0 at 48+ hours
          communicationScore = Math.max(0, Math.round(100 - (avgResponseTime / 60) * 2))

          if (communicationScore < 50) {
            healthReasons.push('Slow communication response times')
            if (overallHealth === 'healthy') {
              overallHealth = 'needs_attention'
            }
          }
        }
      }
    }
  }

  if (healthReasons.length === 0) {
    healthReasons.push('Partnership is progressing well')
  }

  return {
    daysActive,
    deliverableProgress,
    communicationScore,
    onTimeDelivery,
    overallHealth,
    healthReasons
  }
}

/**
 * Get aggregate partnership stats for a user
 */
export async function getUserPartnershipStats(
  userId: string,
  userType: 'brand' | 'creator'
): Promise<{
  total: number
  active: number
  completed: number
  cancelled: number
  avgRating: number | null
}> {
  const supabase = getSupabaseAdmin()

  const column = userType === 'brand' ? 'brand_user_id' : 'creator_user_id'
  const ratingColumn = userType === 'brand' ? 'brand_rating' : 'creator_rating'

  const { data, error } = await supabase
    .from('partnerships')
    .select(`status, ${ratingColumn}`)
    .eq(column, userId)

  if (error || !data) {
    return { total: 0, active: 0, completed: 0, cancelled: 0, avgRating: null }
  }

  // Type the result
  interface StatsRow {
    status: string
    brand_rating?: number | null
    creator_rating?: number | null
  }
  const rows = data as StatsRow[]

  const total = rows.length
  const active = rows.filter(p =>
    ['negotiating', 'active', 'content_pending', 'review'].includes(p.status)
  ).length
  const completed = rows.filter(p => p.status === 'completed').length
  const cancelled = rows.filter(p => p.status === 'cancelled').length

  // Calculate average rating
  const ratings = rows
    .map(p => userType === 'brand' ? p.brand_rating : p.creator_rating)
    .filter((r): r is number => r !== null && r !== undefined)

  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null

  return { total, active, completed, cancelled, avgRating }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map database row to Partnership type
 */
function mapDatabaseToPartnership(row: Record<string, unknown>): Partnership {
  return {
    id: row.id as string,
    briefMatchId: row.brief_match_id as string | null,
    brandUserId: row.brand_user_id as string,
    creatorUserId: row.creator_user_id as string,
    agreedRate: row.agreed_rate as number | null,
    deliverables: (row.deliverables as Deliverable[]) || [],
    contentSubmittedAt: row.content_submitted_at as string | null,
    contentApprovedAt: row.content_approved_at as string | null,
    paymentSentAt: row.payment_sent_at as string | null,
    completedAt: row.completed_at as string | null,
    brandRating: row.brand_rating as number | null,
    creatorRating: row.creator_rating as number | null,
    wellnessNotes: row.wellness_notes as string | null,
    status: row.status as PartnershipStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}
