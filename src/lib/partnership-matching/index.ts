/**
 * Partnership Matching Engine
 *
 * Matches campaign briefs from brands to available creators based on:
 * - Creator availability and capacity
 * - Niche/content alignment
 * - Follower count requirements
 * - Engagement rate requirements
 * - Budget alignment
 * - Campaign type preferences
 */

export {
  checkCreatorAvailability,
  fetchAvailableCreators,
  updateCreatorPartnershipCount,
  type CreatorAvailability,
  type AvailabilityCheckResult
} from './availability-checker'

export {
  calculateMatchScore,
  matchBriefToCreators,
  saveBriefMatches,
  processBriefMatching,
  type CampaignBrief,
  type CreatorProfile,
  type MatchResult
} from './brief-matcher'

export {
  notifyMatchedCreators,
  notifyBrandOfResponse,
  sendEmailNotification,
  generateBriefMatchEmail,
  type NotificationPayload
} from './notification-service'
