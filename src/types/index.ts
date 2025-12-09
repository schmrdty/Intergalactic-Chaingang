/**
 * Type definitions for XMTP token-gated group membership system
 */

export interface TokenConfig {
  address: string;
  name: string;
  symbol: string;
  type: 'ERC20' | 'ERC721' | 'ERC1155';
  chainId: number;
  minBalance?: string; // For ERC20
  tokenId?: string; // For ERC721/1155
}

export interface GroupConfig {
  id: string;
  name: string;
  description: string;
  tokenRequirements: TokenConfig[];
  requireAllTokens: boolean; // true = AND, false = OR
}

export interface ConversationMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  conversationId: string;
}

export interface MockConversation {
  id: string;
  topic: string;
  peerAddress: string;
  messages: ConversationMessage[];
  createdAt: Date;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  signer?: string;
  method: 'EOA' | 'EIP1271' | 'FALLBACK';
  error?: string;
}

export interface MembershipValidationResult {
  isValid: boolean;
  address: string;
  tokensMet: TokenConfig[];
  tokensMissing: TokenConfig[];
  error?: string;
}
