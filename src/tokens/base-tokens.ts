/**
 * Base Chain Token Configurations
 * 
 * Includes Clanker V0-V4 and Doppler tokens for testing
 */

import { TokenConfig } from '../types';

// Base Chain ID
export const BASE_CHAIN_ID = 8453;

/**
 * Clanker Token Configurations (V0-V4)
 * These are example addresses - in production, use actual deployed addresses
 */
export const CLANKER_TOKENS: Record<string, TokenConfig> = {
  CLANKER_V0: {
    address: '0x1234567890123456789012345678901234567890', // Example address
    name: 'Clanker V0',
    symbol: 'CLNK0',
    type: 'ERC20',
    chainId: BASE_CHAIN_ID,
    minBalance: '1000000000000000000' // 1 token (18 decimals)
  },
  CLANKER_V1: {
    address: '0x2345678901234567890123456789012345678901',
    name: 'Clanker V1',
    symbol: 'CLNK1',
    type: 'ERC20',
    chainId: BASE_CHAIN_ID,
    minBalance: '1000000000000000000'
  },
  CLANKER_V2: {
    address: '0x3456789012345678901234567890123456789012',
    name: 'Clanker V2',
    symbol: 'CLNK2',
    type: 'ERC20',
    chainId: BASE_CHAIN_ID,
    minBalance: '1000000000000000000'
  },
  CLANKER_V3: {
    address: '0x4567890123456789012345678901234567890123',
    name: 'Clanker V3',
    symbol: 'CLNK3',
    type: 'ERC20',
    chainId: BASE_CHAIN_ID,
    minBalance: '1000000000000000000'
  },
  CLANKER_V4: {
    address: '0x5678901234567890123456789012345678901234',
    name: 'Clanker V4',
    symbol: 'CLNK4',
    type: 'ERC20',
    chainId: BASE_CHAIN_ID,
    minBalance: '1000000000000000000'
  }
};

/**
 * Doppler Token Configurations (ERC20/721/1155)
 */
export const DOPPLER_TOKENS: Record<string, TokenConfig> = {
  DOPPLER_ERC20: {
    address: '0x6789012345678901234567890123456789012345',
    name: 'Doppler Token',
    symbol: 'DOP',
    type: 'ERC20',
    chainId: BASE_CHAIN_ID,
    minBalance: '100000000000000000000' // 100 tokens
  },
  DOPPLER_ERC721: {
    address: '0x7890123456789012345678901234567890123456',
    name: 'Doppler NFT',
    symbol: 'DOPNFT',
    type: 'ERC721',
    chainId: BASE_CHAIN_ID
    // For ERC721, any ownership is sufficient
  },
  DOPPLER_ERC1155: {
    address: '0x8901234567890123456789012345678901234567',
    name: 'Doppler Multi Token',
    symbol: 'DOPMULTI',
    type: 'ERC1155',
    chainId: BASE_CHAIN_ID,
    tokenId: '1', // Specific token ID required
    minBalance: '1' // Minimum balance of specific token ID
  }
};

/**
 * All supported tokens combined
 */
export const ALL_BASE_TOKENS: Record<string, TokenConfig> = {
  ...CLANKER_TOKENS,
  ...DOPPLER_TOKENS
};

/**
 * Get all Clanker tokens as an array
 */
export function getClankerTokens(): TokenConfig[] {
  return Object.values(CLANKER_TOKENS);
}

/**
 * Get all Doppler tokens as an array
 */
export function getDopplerTokens(): TokenConfig[] {
  return Object.values(DOPPLER_TOKENS);
}

/**
 * Get all Base tokens as an array
 */
export function getAllBaseTokens(): TokenConfig[] {
  return Object.values(ALL_BASE_TOKENS);
}

/**
 * Get token by address
 */
export function getTokenByAddress(address: string): TokenConfig | undefined {
  return getAllBaseTokens().find(
    token => token.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get tokens by type
 */
export function getTokensByType(type: 'ERC20' | 'ERC721' | 'ERC1155'): TokenConfig[] {
  return getAllBaseTokens().filter(token => token.type === type);
}
