# XMTP Token-Gated Group Membership System

A comprehensive TypeScript library for implementing token-gated group membership using XMTP for messaging and EIP-1271 for signature verification.

## Features

- **Mock XMTP Agent Client**: Simulates XMTP conversations for E2E testing and integration setups
- **EIP-1271 Signature Verification**: Robust signature verification with fallback checks for both EOA and smart contract wallets
- **Multi-Token Support**: Validates token requirements across ERC20, ERC721, and ERC1155 standards
- **Base Chain Integration**: Pre-configured support for Clanker (V0-V4) and Doppler tokens
- **Group Management**: Create and manage token-gated groups with flexible AND/OR token requirements

## Installation

```bash
npm install
```

## Project Structure

```
src/
├── mock/                      # Mock XMTP client for testing
│   └── xmtp-client.ts
├── validation/                # Signature and token validation
│   ├── eip1271.ts            # EIP-1271 signature verification
│   └── token-validator.ts    # Token balance validation
├── tokens/                    # Token configurations
│   └── base-tokens.ts        # Clanker and Doppler tokens
├── types/                     # TypeScript type definitions
│   └── index.ts
├── group-manager.ts          # Main group management logic
├── index.ts                  # Public API exports
└── __tests__/                # Test suites
    ├── e2e/                  # End-to-end tests
    ├── integration/          # Integration tests
    └── unit/                 # Unit tests
```

## Quick Start

### 1. Create a Group Manager

```typescript
import { ethers } from 'ethers';
import {
  GroupManager,
  SignatureVerifier,
  TokenValidator,
  createMockXMTPClient
} from './src';

// Setup provider
const provider = new ethers.JsonRpcProvider('https://base.llamarpc.com');

// Create instances
const signatureVerifier = new SignatureVerifier(provider);
const tokenValidator = new TokenValidator(provider);
const xmtpClient = createMockXMTPClient('0xYourAddress', true);

// Initialize group manager
const groupManager = new GroupManager(
  signatureVerifier,
  tokenValidator,
  xmtpClient
);
```

### 2. Create a Token-Gated Group

```typescript
import { CLANKER_TOKENS, DOPPLER_TOKENS } from './src';

const groupConfig = {
  id: 'my-group',
  name: 'Clanker Holders',
  description: 'Exclusive group for Clanker token holders',
  tokenRequirements: [
    CLANKER_TOKENS.CLANKER_V0,
    CLANKER_TOKENS.CLANKER_V1
  ],
  requireAllTokens: false // OR condition - any token is sufficient
};

groupManager.createGroup(groupConfig);
```

### 3. Process Join Requests

```typescript
const wallet = new ethers.Wallet(privateKey);
const message = `Join request for my-group at ${Date.now()}`;
const signature = await wallet.signMessage(message);

const result = await groupManager.processJoinRequest(
  'my-group',
  wallet.address,
  signature,
  message
);

if (result.success) {
  console.log('Successfully joined group!');
} else {
  console.log('Join failed:', result.reason);
}
```

## Token Configurations

### Clanker Tokens (V0-V4)

All Clanker tokens are ERC20 on Base Chain:

```typescript
import { getClankerTokens, CLANKER_TOKENS } from './src';

// Get all Clanker tokens
const allClanker = getClankerTokens();

// Use specific version
const clankerV0 = CLANKER_TOKENS.CLANKER_V0;
```

### Doppler Tokens

Doppler tokens include ERC20, ERC721, and ERC1155:

```typescript
import { getDopplerTokens, DOPPLER_TOKENS } from './src';

// ERC20
const dopplerToken = DOPPLER_TOKENS.DOPPLER_ERC20;

// ERC721 NFT
const dopplerNFT = DOPPLER_TOKENS.DOPPLER_ERC721;

// ERC1155 Multi-Token
const dopplerMulti = DOPPLER_TOKENS.DOPPLER_ERC1155;
```

## Signature Verification

The library implements comprehensive EIP-1271 signature verification:

### EOA (Externally Owned Account)

```typescript
const verifier = new SignatureVerifier(provider);
const result = await verifier.verifySignature(
  message,
  signature,
  walletAddress
);

console.log('Valid:', result.isValid);
console.log('Method:', result.method); // 'EOA'
```

### Smart Contract Wallets (EIP-1271)

The verifier automatically detects smart contract wallets and uses EIP-1271:

```typescript
const result = await verifier.verifySignature(
  message,
  signature,
  contractWalletAddress
);

console.log('Method:', result.method); // 'EIP1271' or 'FALLBACK'
```

### Fallback Mechanisms

The verifier includes multiple fallback methods:
1. Standard EOA signature recovery
2. Raw message hash verification
3. EIP-1271 for contracts
4. Alternative prefixing methods

## Mock XMTP Client

Perfect for E2E testing without real XMTP network calls:

### Basic Usage

```typescript
import { createMockXMTPClient } from './src';

const client = createMockXMTPClient(walletAddress, true); // auto-reply enabled

// Create conversation
const conversation = await client.createConversation(peerAddress);

// Send message
await client.sendMessage(conversation.id, 'Hello!');

// Get messages
const messages = await client.getMessages(conversation.id);
```

### Simulating Group Joins

```typescript
// Simulate join request
const joinRequest = await client.simulateGroupJoinRequest(
  'group-id',
  requesterAddress
);

// Simulate approval
await client.simulateGroupJoinApproval(
  conversation.id,
  'group-id',
  true,
  'Token requirements met'
);
```

### Message Streaming

```typescript
// Stream messages
await client.streamMessages(conversation.id, (message) => {
  console.log('New message:', message.content);
});

// Stream conversations
await client.streamConversations((conversation) => {
  console.log('New conversation:', conversation.peerAddress);
});
```

## Token Validation

### Check Token Requirements

```typescript
const validator = new TokenValidator(provider);

const result = await validator.validateMembership(
  userAddress,
  [CLANKER_TOKENS.CLANKER_V0],
  false // OR condition
);

if (result.isValid) {
  console.log('Tokens met:', result.tokensMet);
} else {
  console.log('Missing tokens:', result.tokensMissing);
}
```

### Get Token Balances

```typescript
const balances = await validator.getTokenBalances(
  userAddress,
  [CLANKER_TOKENS.CLANKER_V0, DOPPLER_TOKENS.DOPPLER_ERC20]
);

for (const [symbol, balance] of balances) {
  console.log(`${symbol}: ${balance}`);
}
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# E2E tests
npm test -- e2e

# Integration tests
npm test -- integration

# Unit tests
npm test -- unit
```

### Coverage Report

```bash
npm test -- --coverage
```

## Building

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Configuration

### Custom Token Configuration

```typescript
import { TokenConfig } from './src';

const customToken: TokenConfig = {
  address: '0xYourTokenAddress',
  name: 'My Token',
  symbol: 'MTK',
  type: 'ERC20',
  chainId: 8453, // Base Chain
  minBalance: '1000000000000000000' // 1 token (18 decimals)
};
```

### Group Requirements

Groups support both AND and OR logic for token requirements:

```typescript
// AND condition - must hold all tokens
const exclusiveGroup = {
  id: 'exclusive',
  name: 'Exclusive Group',
  description: 'Must hold all tokens',
  tokenRequirements: [token1, token2, token3],
  requireAllTokens: true
};

// OR condition - must hold at least one token
const inclusiveGroup = {
  id: 'inclusive',
  name: 'Inclusive Group',
  description: 'Must hold any token',
  tokenRequirements: [token1, token2, token3],
  requireAllTokens: false
};
```

## API Reference

### GroupManager

- `createGroup(config: GroupConfig): void`
- `getGroup(groupId: string): GroupConfig | undefined`
- `listGroups(): GroupConfig[]`
- `processJoinRequest(groupId, address, signature, message): Promise<JoinRequestResult>`
- `canJoinGroup(groupId, address): Promise<MembershipValidationResult>`
- `getEligibleGroups(address): Promise<GroupConfig[]>`
- `updateGroup(groupId, updates): boolean`
- `removeGroup(groupId): boolean`

### SignatureVerifier

- `verifySignature(message, signature, signer): Promise<SignatureVerificationResult>`
- `verifySignatures(verifications): Promise<SignatureVerificationResult[]>`

### TokenValidator

- `validateMembership(address, requirements, requireAll): Promise<MembershipValidationResult>`
- `validateMultiple(addresses, requirements, requireAll): Promise<Map<string, MembershipValidationResult>>`
- `getTokenBalances(address, tokens): Promise<Map<string, string>>`

### MockXMTPClient

- `createConversation(peerAddress): Promise<MockConversation>`
- `sendMessage(conversationId, content): Promise<ConversationMessage>`
- `getMessages(conversationId): Promise<ConversationMessage[]>`
- `listConversations(): Promise<MockConversation[]>`
- `simulateGroupJoinRequest(groupId, requester): Promise<ConversationMessage>`
- `simulateGroupJoinApproval(conversationId, groupId, approved, reason): Promise<ConversationMessage>`
- `streamMessages(conversationId, callback): Promise<void>`
- `reset(): void`

## Example Use Cases

### 1. Exclusive Holder Group

Create a group for users holding specific NFTs:

```typescript
const nftGroup = {
  id: 'nft-holders',
  name: 'NFT Holders',
  description: 'Exclusive group for NFT holders',
  tokenRequirements: [DOPPLER_TOKENS.DOPPLER_ERC721],
  requireAllTokens: true
};

groupManager.createGroup(nftGroup);
```

### 2. Multi-Token Tier System

Create tiered groups based on token holdings:

```typescript
// Tier 1: Any Clanker token
const tier1 = {
  id: 'tier-1',
  name: 'Bronze Members',
  description: 'Hold any Clanker token',
  tokenRequirements: getClankerTokens(),
  requireAllTokens: false
};

// Tier 2: Multiple tokens required
const tier2 = {
  id: 'tier-2',
  name: 'Gold Members',
  description: 'Hold Clanker V4 and Doppler NFT',
  tokenRequirements: [
    CLANKER_TOKENS.CLANKER_V4,
    DOPPLER_TOKENS.DOPPLER_ERC721
  ],
  requireAllTokens: true
};
```

### 3. Testing Integration

Use mock client for integration tests:

```typescript
describe('Group Join Integration', () => {
  it('should process complete join flow', async () => {
    const client = createMockXMTPClient(adminAddress, true);
    const groupManager = new GroupManager(verifier, validator, client);
    
    // Create group
    groupManager.createGroup(groupConfig);
    
    // Simulate join request
    const result = await groupManager.processJoinRequest(
      groupConfig.id,
      userAddress,
      signature,
      message
    );
    
    expect(result.success).toBe(true);
  });
});
```

## Security Considerations

1. **Signature Verification**: Always verify signatures before processing requests
2. **Token Validation**: Validate token holdings on-chain
3. **Address Normalization**: All addresses are normalized using `ethers.getAddress()`
4. **Error Handling**: Comprehensive error handling prevents crashes
5. **Fallback Mechanisms**: Multiple verification methods ensure reliability

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass: `npm test`
2. Code is properly typed
3. Follow existing code style
4. Add tests for new features

## License

MIT
