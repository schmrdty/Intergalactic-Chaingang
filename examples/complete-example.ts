/**
 * Complete Example: XMTP Token-Gated Group Membership System
 * 
 * Run with: npx ts-node examples/complete-example.ts
 */

import { ethers } from 'ethers';
import {
  GroupManager,
  SignatureVerifier,
  TokenValidator,
  createMockXMTPClient,
  CLANKER_TOKENS,
  DOPPLER_TOKENS,
  GroupConfig
} from '../src';

async function main() {
  console.log('🚀 XMTP Token-Gated Groups Example\n');

  // Setup
  const provider = new ethers.JsonRpcProvider('https://base.llamarpc.com');
  const signatureVerifier = new SignatureVerifier(provider);
  const tokenValidator = new TokenValidator(provider);
  const adminWallet = ethers.Wallet.createRandom();
  const xmtpClient = createMockXMTPClient(adminWallet.address, true);

  const groupManager = new GroupManager(
    signatureVerifier,
    tokenValidator,
    xmtpClient
  );

  // Create a token-gated group
  const groupConfig: GroupConfig = {
    id: 'clanker-group',
    name: 'Clanker Holders',
    description: 'Exclusive group for Clanker token holders',
    tokenRequirements: [CLANKER_TOKENS.CLANKER_V0],
    requireAllTokens: false
  };

  groupManager.createGroup(groupConfig);
  console.log('✅ Group created:', groupConfig.name);

  // Simulate join request
  const userWallet = ethers.Wallet.createRandom();
  const message = \`Join request at \${Date.now()}\`;
  const signature = await userWallet.signMessage(message);

  const result = await groupManager.processJoinRequest(
    'clanker-group',
    userWallet.address,
    signature,
    message
  );

  console.log('📊 Join result:', result.success ? '✅ Success' : '❌ Failed');
  console.log('   Reason:', result.reason);
  console.log('   Signature valid:', result.signature?.isValid);
}

main().catch(console.error);
