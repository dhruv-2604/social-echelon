/**
 * Partnerships Module
 *
 * Manages the lifecycle of brand-creator partnerships
 */

export {
  // Types
  type PartnershipStatus,
  type Deliverable,
  type Partnership,
  type PartnershipWithDetails,
  type CreatePartnershipParams,
  type PartnershipHealthMetrics,

  // Core CRUD
  createPartnership,
  getPartnership,
  getPartnershipWithDetails,
  getPartnershipsByUser,
  getPartnershipByMatchId,

  // Status Management
  updatePartnershipStatus,

  // Deliverables
  updateDeliverables,
  markDeliverableComplete,

  // Content & Payment
  submitContent,
  approveContent,
  markPaymentSent,
  completePartnership,

  // Ratings
  ratePartnership,

  // Health & Metrics
  getPartnershipHealth,
  getUserPartnershipStats
} from './partnership-service'
