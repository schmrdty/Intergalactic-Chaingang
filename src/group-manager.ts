/**
 * Token-Gated Group Membership Manager
 * 
 * Manages group membership validation and XMTP interactions
 */

import { GroupConfig, MembershipValidationResult, SignatureVerificationResult } from './types';
import { SignatureVerifier } from './validation/eip1271';
import { TokenValidator } from './validation/token-validator';
import { MockXMTPClient } from './mock/xmtp-client';

export interface JoinRequestResult {
  success: boolean;
  reason?: string;
  membership?: MembershipValidationResult;
  signature?: SignatureVerificationResult;
}

export class GroupManager {
  private groups: Map<string, GroupConfig>;
  private signatureVerifier: SignatureVerifier;
  private tokenValidator: TokenValidator;
  private xmtpClient?: MockXMTPClient;

  constructor(
    signatureVerifier: SignatureVerifier,
    tokenValidator: TokenValidator,
    xmtpClient?: MockXMTPClient
  ) {
    this.groups = new Map();
    this.signatureVerifier = signatureVerifier;
    this.tokenValidator = tokenValidator;
    this.xmtpClient = xmtpClient;
  }

  /**
   * Create a new token-gated group
   */
  createGroup(config: GroupConfig): void {
    this.groups.set(config.id, config);
  }

  /**
   * Get a group by ID
   */
  getGroup(groupId: string): GroupConfig | undefined {
    return this.groups.get(groupId);
  }

  /**
   * List all groups
   */
  listGroups(): GroupConfig[] {
    return Array.from(this.groups.values());
  }

  /**
   * Process a group join request
   * 
   * @param groupId - ID of the group to join
   * @param requesterAddress - Address of the requester
   * @param signature - Signature proving ownership of address
   * @param message - Original message that was signed
   */
  async processJoinRequest(
    groupId: string,
    requesterAddress: string,
    signature: string,
    message: string
  ): Promise<JoinRequestResult> {
    // Get group configuration
    const group = this.groups.get(groupId);
    if (!group) {
      return {
        success: false,
        reason: `Group ${groupId} not found`
      };
    }

    // Verify signature
    const signatureResult = await this.signatureVerifier.verifySignature(
      message,
      signature,
      requesterAddress
    );

    if (!signatureResult.isValid) {
      return {
        success: false,
        reason: `Signature verification failed: ${signatureResult.error}`,
        signature: signatureResult
      };
    }

    // Validate token requirements
    const membershipResult = await this.tokenValidator.validateMembership(
      requesterAddress,
      group.tokenRequirements,
      group.requireAllTokens
    );

    if (!membershipResult.isValid) {
      const missingTokens = membershipResult.tokensMissing
        .map(t => t.symbol)
        .join(', ');
      return {
        success: false,
        reason: `Token requirements not met. Missing: ${missingTokens}`,
        membership: membershipResult,
        signature: signatureResult
      };
    }

    // Send approval via XMTP if client is available
    if (this.xmtpClient) {
      try {
        const conversation = await this.xmtpClient.createConversation(requesterAddress);
        await this.xmtpClient.simulateGroupJoinApproval(
          conversation.id,
          groupId,
          true,
          'Token requirements met'
        );
      } catch (error) {
        console.warn('Failed to send XMTP notification:', error);
        // Don't fail the join request if XMTP fails
      }
    }

    return {
      success: true,
      reason: 'Successfully joined group',
      membership: membershipResult,
      signature: signatureResult
    };
  }

  /**
   * Validate if an address can join a group (without processing)
   */
  async canJoinGroup(
    groupId: string,
    address: string
  ): Promise<MembershipValidationResult> {
    const group = this.groups.get(groupId);
    if (!group) {
      return {
        isValid: false,
        address,
        tokensMet: [],
        tokensMissing: [],
        error: `Group ${groupId} not found`
      };
    }

    return this.tokenValidator.validateMembership(
      address,
      group.tokenRequirements,
      group.requireAllTokens
    );
  }

  /**
   * Get all groups that an address is eligible to join
   */
  async getEligibleGroups(address: string): Promise<GroupConfig[]> {
    const eligibleGroups: GroupConfig[] = [];

    for (const group of this.groups.values()) {
      const result = await this.tokenValidator.validateMembership(
        address,
        group.tokenRequirements,
        group.requireAllTokens
      );

      if (result.isValid) {
        eligibleGroups.push(group);
      }
    }

    return eligibleGroups;
  }

  /**
   * Remove a group
   */
  removeGroup(groupId: string): boolean {
    return this.groups.delete(groupId);
  }

  /**
   * Update group configuration
   */
  updateGroup(groupId: string, updates: Partial<GroupConfig>): boolean {
    const group = this.groups.get(groupId);
    if (!group) {
      return false;
    }

    const updated = { ...group, ...updates, id: groupId }; // Preserve ID
    this.groups.set(groupId, updated);
    return true;
  }

  /**
   * Get group member count (requires tracking members separately)
   * This is a placeholder - actual implementation would need member tracking
   */
  getGroupMemberCount(groupId: string): number {
    return this.groups.has(groupId) ? 0 : -1;
  }
}
