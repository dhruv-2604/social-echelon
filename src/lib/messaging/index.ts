/**
 * Messaging Module
 *
 * Handles communication between brands and creators via masked email relays.
 */

export {
  createRelayForMatch,
  getRelayByEmail,
  getRelayByMatchId,
  forwardEmail,
  getRelayMessages,
  closeRelay,
  getRelayWellnessMetrics
} from './relay-service'
