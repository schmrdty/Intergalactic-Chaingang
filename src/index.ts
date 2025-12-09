/**
 * XMTP Token-Gated Group Membership System
 * 
 * Main entry point for the library
 */

// Core classes
export { GroupManager } from './group-manager';
export { SignatureVerifier } from './validation/eip1271';
export { TokenValidator } from './validation/token-validator';

// Mock XMTP client
export { MockXMTPClient, createMockXMTPClient } from './mock/xmtp-client';

// Token configurations
export {
  CLANKER_TOKENS,
  DOPPLER_TOKENS,
  ALL_BASE_TOKENS,
  BASE_CHAIN_ID,
  getClankerTokens,
  getDopplerTokens,
  getAllBaseTokens,
  getTokenByAddress,
  getTokensByType
} from './tokens/base-tokens';

// Types
export type {
  TokenConfig,
  GroupConfig,
  ConversationMessage,
  MockConversation,
  SignatureVerificationResult,
  MembershipValidationResult
} from './types';

export type { MockXMTPClientConfig } from './mock/xmtp-client';
export type { JoinRequestResult } from './group-manager';
