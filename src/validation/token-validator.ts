/**
 * Token Balance and Ownership Validator
 * 
 * Validates user token holdings against requirements for group membership
 */

import { ethers } from 'ethers';
import { TokenConfig, MembershipValidationResult } from '../types';

// Standard token ABIs
const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

const ERC721_ABI = ['function balanceOf(address owner) view returns (uint256)'];

const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)'
];

export class TokenValidator {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  /**
   * Validate if an address meets token requirements
   * 
   * @param address - Address to validate
   * @param requirements - Array of token requirements
   * @param requireAll - If true, all tokens must be met (AND). If false, any token is sufficient (OR)
   */
  async validateMembership(
    address: string,
    requirements: TokenConfig[],
    requireAll: boolean = false
  ): Promise<MembershipValidationResult> {
    try {
      const normalizedAddress = ethers.getAddress(address);
      const tokensMet: TokenConfig[] = [];
      const tokensMissing: TokenConfig[] = [];

      // Check each token requirement
      for (const token of requirements) {
        const hasToken = await this.checkTokenBalance(normalizedAddress, token);
        if (hasToken) {
          tokensMet.push(token);
        } else {
          tokensMissing.push(token);
        }
      }

      // Determine if validation passes based on requireAll flag
      const isValid = requireAll
        ? tokensMissing.length === 0
        : tokensMet.length > 0;

      return {
        isValid,
        address: normalizedAddress,
        tokensMet,
        tokensMissing
      };
    } catch (error) {
      return {
        isValid: false,
        address,
        tokensMet: [],
        tokensMissing: requirements,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Check if address has sufficient balance of a specific token
   */
  private async checkTokenBalance(
    address: string,
    token: TokenConfig
  ): Promise<boolean> {
    try {
      switch (token.type) {
        case 'ERC20':
          return await this.checkERC20Balance(address, token);
        case 'ERC721':
          return await this.checkERC721Balance(address, token);
        case 'ERC1155':
          return await this.checkERC1155Balance(address, token);
        default:
          throw new Error(`Unsupported token type: ${token.type}`);
      }
    } catch (error) {
      console.error(`Error checking token balance for ${token.symbol}:`, error);
      return false;
    }
  }

  /**
   * Check ERC20 token balance
   */
  private async checkERC20Balance(
    address: string,
    token: TokenConfig
  ): Promise<boolean> {
    const contract = new ethers.Contract(token.address, ERC20_ABI, this.provider);
    const balance = await contract.balanceOf(address);
    
    const minBalance = BigInt(token.minBalance || '0');
    return balance >= minBalance;
  }

  /**
   * Check ERC721 token ownership (any token)
   */
  private async checkERC721Balance(
    address: string,
    token: TokenConfig
  ): Promise<boolean> {
    const contract = new ethers.Contract(token.address, ERC721_ABI, this.provider);
    const balance = await contract.balanceOf(address);
    
    // For ERC721, any ownership (balance > 0) is sufficient
    return balance > 0n;
  }

  /**
   * Check ERC1155 token balance for specific token ID
   */
  private async checkERC1155Balance(
    address: string,
    token: TokenConfig
  ): Promise<boolean> {
    if (!token.tokenId) {
      throw new Error('Token ID required for ERC1155 validation');
    }

    const contract = new ethers.Contract(token.address, ERC1155_ABI, this.provider);
    const balance = await contract.balanceOf(address, token.tokenId);
    
    const minBalance = BigInt(token.minBalance || '1');
    return balance >= minBalance;
  }

  /**
   * Batch validate multiple addresses
   */
  async validateMultiple(
    addresses: string[],
    requirements: TokenConfig[],
    requireAll: boolean = false
  ): Promise<Map<string, MembershipValidationResult>> {
    const results = new Map<string, MembershipValidationResult>();

    await Promise.all(
      addresses.map(async address => {
        const result = await this.validateMembership(address, requirements, requireAll);
        results.set(address, result);
      })
    );

    return results;
  }

  /**
   * Get detailed token balances for an address
   */
  async getTokenBalances(
    address: string,
    tokens: TokenConfig[]
  ): Promise<Map<string, string>> {
    const balances = new Map<string, string>();

    for (const token of tokens) {
      try {
        const balance = await this.getTokenBalance(address, token);
        balances.set(token.symbol, balance);
      } catch (error) {
        balances.set(token.symbol, '0');
      }
    }

    return balances;
  }

  /**
   * Get balance for a specific token
   */
  private async getTokenBalance(address: string, token: TokenConfig): Promise<string> {
    switch (token.type) {
      case 'ERC20': {
        const contract = new ethers.Contract(token.address, ERC20_ABI, this.provider);
        const balance = await contract.balanceOf(address);
        return balance.toString();
      }
      case 'ERC721': {
        const contract = new ethers.Contract(token.address, ERC721_ABI, this.provider);
        const balance = await contract.balanceOf(address);
        return balance.toString();
      }
      case 'ERC1155': {
        if (!token.tokenId) return '0';
        const contract = new ethers.Contract(token.address, ERC1155_ABI, this.provider);
        const balance = await contract.balanceOf(address, token.tokenId);
        return balance.toString();
      }
      default:
        return '0';
    }
  }
}
