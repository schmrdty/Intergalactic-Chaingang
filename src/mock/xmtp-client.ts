/**
 * Mock XMTP Agent Client for E2E Testing and Integration
 * 
 * Simulates XMTP client behavior for testing without real network calls
 */

import { MockConversation, ConversationMessage } from '../types';

export interface MockXMTPClientConfig {
  walletAddress: string;
  autoReply?: boolean;
  replyDelay?: number; // milliseconds
}

export class MockXMTPClient {
  private walletAddress: string;
  private conversations: Map<string, MockConversation>;
  private messageListeners: Map<string, Array<(message: ConversationMessage) => void>>;
  private autoReply: boolean;
  private replyDelay: number;
  private messageIdCounter: number;

  constructor(config: MockXMTPClientConfig) {
    this.walletAddress = config.walletAddress;
    this.conversations = new Map();
    this.messageListeners = new Map();
    this.autoReply = config.autoReply ?? false;
    this.replyDelay = config.replyDelay ?? 100;
    this.messageIdCounter = 0;
  }

  /**
   * Get the wallet address for this client
   */
  getAddress(): string {
    return this.walletAddress;
  }

  /**
   * Create or get a conversation with a peer
   */
  async createConversation(peerAddress: string): Promise<MockConversation> {
    const topic = this.generateTopic(this.walletAddress, peerAddress);
    
    let conversation = this.conversations.get(topic);
    if (!conversation) {
      conversation = {
        id: topic,
        topic,
        peerAddress,
        messages: [],
        createdAt: new Date()
      };
      this.conversations.set(topic, conversation);
    }

    return conversation;
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<ConversationMessage> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const message: ConversationMessage = {
      id: `msg-${this.messageIdCounter++}`,
      content,
      sender: this.walletAddress,
      timestamp: new Date(),
      conversationId
    };

    conversation.messages.push(message);
    this.notifyListeners(conversationId, message);

    // Simulate auto-reply if enabled
    if (this.autoReply) {
      this.scheduleAutoReply(conversationId, content);
    }

    return message;
  }

  /**
   * Get all messages from a conversation
   */
  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    return [...conversation.messages];
  }

  /**
   * List all conversations
   */
  async listConversations(): Promise<MockConversation[]> {
    return Array.from(this.conversations.values());
  }

  /**
   * Stream messages from a conversation
   */
  async streamMessages(
    conversationId: string,
    callback: (message: ConversationMessage) => void
  ): Promise<void> {
    if (!this.messageListeners.has(conversationId)) {
      this.messageListeners.set(conversationId, []);
    }
    
    this.messageListeners.get(conversationId)!.push(callback);
  }

  /**
   * Stream all conversations
   */
  async streamConversations(
    callback: (conversation: MockConversation) => void
  ): Promise<void> {
    // Notify for existing conversations
    for (const conversation of this.conversations.values()) {
      callback(conversation);
    }
  }

  /**
   * Simulate receiving a message from a peer
   */
  simulateIncomingMessage(
    conversationId: string,
    peerAddress: string,
    content: string
  ): ConversationMessage {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const message: ConversationMessage = {
      id: `msg-${this.messageIdCounter++}`,
      content,
      sender: peerAddress,
      timestamp: new Date(),
      conversationId
    };

    conversation.messages.push(message);
    this.notifyListeners(conversationId, message);

    // Simulate auto-reply if enabled for incoming messages
    if (this.autoReply) {
      this.scheduleAutoReply(conversationId, content);
    }

    return message;
  }

  /**
   * Simulate group join request
   */
  async simulateGroupJoinRequest(
    groupId: string,
    requesterAddress: string
  ): Promise<ConversationMessage> {
    const conversation = await this.createConversation(requesterAddress);
    const content = JSON.stringify({
      type: 'group_join_request',
      groupId,
      requester: requesterAddress,
      timestamp: new Date().toISOString()
    });

    return this.simulateIncomingMessage(conversation.id, requesterAddress, content);
  }

  /**
   * Simulate group join approval
   */
  async simulateGroupJoinApproval(
    conversationId: string,
    groupId: string,
    approved: boolean,
    reason?: string
  ): Promise<ConversationMessage> {
    const content = JSON.stringify({
      type: 'group_join_response',
      groupId,
      approved,
      reason,
      timestamp: new Date().toISOString()
    });

    return this.sendMessage(conversationId, content);
  }

  /**
   * Clear all conversations and reset state
   */
  reset(): void {
    this.conversations.clear();
    this.messageListeners.clear();
    this.messageIdCounter = 0;
  }

  /**
   * Get conversation by peer address
   */
  getConversationByPeer(peerAddress: string): MockConversation | undefined {
    for (const conversation of this.conversations.values()) {
      if (conversation.peerAddress === peerAddress) {
        return conversation;
      }
    }
    return undefined;
  }

  // Private helper methods

  private generateTopic(address1: string, address2: string): string {
    const sorted = [address1.toLowerCase(), address2.toLowerCase()].sort();
    return `xmtp-${sorted[0]}-${sorted[1]}`;
  }

  private notifyListeners(conversationId: string, message: ConversationMessage): void {
    const listeners = this.messageListeners.get(conversationId);
    if (listeners) {
      listeners.forEach(callback => callback(message));
    }
  }

  private scheduleAutoReply(conversationId: string, originalMessage: string): void {
    setTimeout(() => {
      const conversation = this.conversations.get(conversationId);
      if (!conversation) return;

      const autoReplyContent = this.generateAutoReply(originalMessage);
      this.simulateIncomingMessage(
        conversationId,
        conversation.peerAddress,
        autoReplyContent
      );
    }, this.replyDelay);
  }

  private generateAutoReply(message: string): string {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'group_join_request') {
        return JSON.stringify({
          type: 'group_join_response',
          groupId: parsed.groupId,
          approved: true,
          reason: 'Auto-approved in test mode',
          timestamp: new Date().toISOString()
        });
      }
    } catch {
      // Not JSON, return generic reply
    }

    return `Auto-reply: Received your message "${message.substring(0, 50)}..."`;
  }
}

/**
 * Factory function to create mock XMTP clients for testing
 */
export function createMockXMTPClient(
  walletAddress: string,
  autoReply = false
): MockXMTPClient {
  return new MockXMTPClient({ walletAddress, autoReply });
}
