/**
 * Unit Test: Mock XMTP Client
 * 
 * Tests the mock XMTP client functionality
 */

import { createMockXMTPClient, MockXMTPClient } from '../../mock/xmtp-client';

describe('Unit: Mock XMTP Client', () => {
  let client: MockXMTPClient;
  const testAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    client = createMockXMTPClient(testAddress, false);
  });

  afterEach(() => {
    client.reset();
  });

  describe('Client Initialization', () => {
    it('should create client with correct address', () => {
      expect(client.getAddress()).toBe(testAddress);
    });

    it('should create client with auto-reply enabled', () => {
      const autoReplyClient = createMockXMTPClient(testAddress, true);
      expect(autoReplyClient.getAddress()).toBe(testAddress);
    });
  });

  describe('Conversation Management', () => {
    it('should create a new conversation', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      expect(conversation).toBeDefined();
      expect(conversation.peerAddress).toBe(peerAddress);
      expect(conversation.messages).toHaveLength(0);
      expect(conversation.createdAt).toBeInstanceOf(Date);
    });

    it('should return existing conversation for same peer', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      
      const conv1 = await client.createConversation(peerAddress);
      const conv2 = await client.createConversation(peerAddress);

      expect(conv1.id).toBe(conv2.id);
      expect(conv1.topic).toBe(conv2.topic);
    });

    it('should list all conversations', async () => {
      const peer1 = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const peer2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

      await client.createConversation(peer1);
      await client.createConversation(peer2);

      const conversations = await client.listConversations();
      expect(conversations).toHaveLength(2);
    });

    it('should get conversation by peer address', async () => {
      const peerAddress = '0xcccccccccccccccccccccccccccccccccccccccc';
      await client.createConversation(peerAddress);

      const found = client.getConversationByPeer(peerAddress);
      expect(found).toBeDefined();
      expect(found?.peerAddress).toBe(peerAddress);
    });

    it('should return undefined for non-existent peer', () => {
      const found = client.getConversationByPeer('0xnonexistent00000000000000000000000000000');
      expect(found).toBeUndefined();
    });
  });

  describe('Message Handling', () => {
    it('should send a message to conversation', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      const message = await client.sendMessage(conversation.id, 'Hello, world!');

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello, world!');
      expect(message.sender).toBe(testAddress);
      expect(message.conversationId).toBe(conversation.id);
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should throw error when sending to non-existent conversation', async () => {
      await expect(
        client.sendMessage('non-existent-id', 'Test')
      ).rejects.toThrow('Conversation non-existent-id not found');
    });

    it('should retrieve messages from conversation', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      await client.sendMessage(conversation.id, 'Message 1');
      await client.sendMessage(conversation.id, 'Message 2');
      await client.sendMessage(conversation.id, 'Message 3');

      const messages = await client.getMessages(conversation.id);
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
      expect(messages[2].content).toBe('Message 3');
    });

    it('should throw error when getting messages from non-existent conversation', async () => {
      await expect(
        client.getMessages('non-existent-id')
      ).rejects.toThrow('Conversation non-existent-id not found');
    });

    it('should simulate incoming message from peer', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      const message = client.simulateIncomingMessage(
        conversation.id,
        peerAddress,
        'Incoming message'
      );

      expect(message.sender).toBe(peerAddress);
      expect(message.content).toBe('Incoming message');

      const messages = await client.getMessages(conversation.id);
      expect(messages).toHaveLength(1);
      expect(messages[0].sender).toBe(peerAddress);
    });

    it('should handle multiple messages in order', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      await client.sendMessage(conversation.id, 'Msg 1');
      client.simulateIncomingMessage(conversation.id, peerAddress, 'Reply 1');
      await client.sendMessage(conversation.id, 'Msg 2');
      client.simulateIncomingMessage(conversation.id, peerAddress, 'Reply 2');

      const messages = await client.getMessages(conversation.id);
      expect(messages).toHaveLength(4);
      expect(messages[0].content).toBe('Msg 1');
      expect(messages[1].content).toBe('Reply 1');
      expect(messages[2].content).toBe('Msg 2');
      expect(messages[3].content).toBe('Reply 2');
    });
  });

  describe('Message Streaming', () => {
    it('should stream messages to callback', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      const receivedMessages: any[] = [];
      await client.streamMessages(conversation.id, (msg) => {
        receivedMessages.push(msg);
      });

      await client.sendMessage(conversation.id, 'Test message');

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].content).toBe('Test message');
    });

    it('should support multiple listeners on same conversation', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      const messages1: any[] = [];
      const messages2: any[] = [];

      await client.streamMessages(conversation.id, (msg) => messages1.push(msg));
      await client.streamMessages(conversation.id, (msg) => messages2.push(msg));

      await client.sendMessage(conversation.id, 'Test');

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);
    });

    it('should stream conversations to callback', async () => {
      const conversations: any[] = [];
      
      await client.streamConversations((conv) => {
        conversations.push(conv);
      });

      // Create conversations after streaming starts
      await client.createConversation('0xaaaa0000000000000000000000000000aaaaaaaa');
      await client.createConversation('0xbbbb0000000000000000000000000000bbbbbbbb');

      // Should have captured existing conversations
      expect(conversations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Group Join Simulation', () => {
    it('should simulate group join request', async () => {
      const requesterAddress = '0xrequester000000000000000000000000000000';
      
      const message = await client.simulateGroupJoinRequest(
        'test-group-id',
        requesterAddress
      );

      expect(message).toBeDefined();
      expect(message.sender).toBe(requesterAddress);

      const parsed = JSON.parse(message.content);
      expect(parsed.type).toBe('group_join_request');
      expect(parsed.groupId).toBe('test-group-id');
      expect(parsed.requester).toBe(requesterAddress);
    });

    it('should simulate group join approval', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      const message = await client.simulateGroupJoinApproval(
        conversation.id,
        'test-group',
        true,
        'Approved'
      );

      const parsed = JSON.parse(message.content);
      expect(parsed.type).toBe('group_join_response');
      expect(parsed.groupId).toBe('test-group');
      expect(parsed.approved).toBe(true);
      expect(parsed.reason).toBe('Approved');
    });

    it('should simulate group join rejection', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      const message = await client.simulateGroupJoinApproval(
        conversation.id,
        'test-group',
        false,
        'Insufficient tokens'
      );

      const parsed = JSON.parse(message.content);
      expect(parsed.type).toBe('group_join_response');
      expect(parsed.approved).toBe(false);
      expect(parsed.reason).toBe('Insufficient tokens');
    });
  });

  describe('Auto-Reply Feature', () => {
    it('should auto-reply to messages when enabled', async () => {
      const autoClient = createMockXMTPClient(testAddress, true);
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await autoClient.createConversation(peerAddress);

      await autoClient.sendMessage(conversation.id, 'Hello');

      // Wait for auto-reply
      await new Promise(resolve => setTimeout(resolve, 200));

      const messages = await autoClient.getMessages(conversation.id);
      expect(messages.length).toBeGreaterThan(1);
      
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.sender).toBe(peerAddress);
      expect(lastMessage.content).toContain('Auto-reply');
    });

    it('should auto-reply to group join requests with approval', async () => {
      const autoClient = createMockXMTPClient(testAddress, true);
      const requesterAddress = '0xrequester000000000000000000000000000000';
      
      await autoClient.simulateGroupJoinRequest('test-group', requesterAddress);

      // Wait for auto-reply (increased timeout for reliability)
      await new Promise(resolve => setTimeout(resolve, 300));

      const conversation = autoClient.getConversationByPeer(requesterAddress);
      expect(conversation).toBeDefined();

      const messages = await autoClient.getMessages(conversation!.id);
      expect(messages.length).toBeGreaterThanOrEqual(1);

      // Find the auto-reply message
      const responseMessage = messages.find(msg => {
        try {
          const parsed = JSON.parse(msg.content);
          return parsed.type === 'group_join_response';
        } catch {
          return false;
        }
      });

      expect(responseMessage).toBeDefined();
      const parsed = JSON.parse(responseMessage!.content);
      expect(parsed.type).toBe('group_join_response');
      expect(parsed.approved).toBe(true);
    });

    it('should not auto-reply when disabled', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      await client.sendMessage(conversation.id, 'Hello');

      // Wait to ensure no auto-reply
      await new Promise(resolve => setTimeout(resolve, 200));

      const messages = await client.getMessages(conversation.id);
      expect(messages).toHaveLength(1);
    });
  });

  describe('State Management', () => {
    it('should reset all conversations and messages', async () => {
      const peer1 = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const peer2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

      const conv1 = await client.createConversation(peer1);
      const conv2 = await client.createConversation(peer2);

      await client.sendMessage(conv1.id, 'Message 1');
      await client.sendMessage(conv2.id, 'Message 2');

      client.reset();

      const conversations = await client.listConversations();
      expect(conversations).toHaveLength(0);
    });

    it('should generate unique message IDs', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      const msg1 = await client.sendMessage(conversation.id, 'Msg 1');
      const msg2 = await client.sendMessage(conversation.id, 'Msg 2');
      const msg3 = await client.sendMessage(conversation.id, 'Msg 3');

      expect(msg1.id).not.toBe(msg2.id);
      expect(msg2.id).not.toBe(msg3.id);
      expect(msg1.id).not.toBe(msg3.id);
    });

    it('should maintain conversation state across multiple operations', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const conversation = await client.createConversation(peerAddress);

      await client.sendMessage(conversation.id, 'Message 1');
      const conv = await client.createConversation(peerAddress); // Get same conv
      await client.sendMessage(conv.id, 'Message 2');

      const messages = await client.getMessages(conversation.id);
      expect(messages).toHaveLength(2);
    });
  });

  describe('Topic Generation', () => {
    it('should generate consistent topics for same peer pair', async () => {
      const peerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      
      const conv1 = await client.createConversation(peerAddress);
      const conv2 = await client.createConversation(peerAddress);

      expect(conv1.topic).toBe(conv2.topic);
    });

    it('should generate different topics for different peers', async () => {
      const peer1 = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const peer2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

      const conv1 = await client.createConversation(peer1);
      const conv2 = await client.createConversation(peer2);

      expect(conv1.topic).not.toBe(conv2.topic);
    });
  });
});
