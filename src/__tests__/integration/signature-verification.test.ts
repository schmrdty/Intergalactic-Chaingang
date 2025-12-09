/**
 * Integration Test: EIP-1271 Signature Verification
 * 
 * Tests signature verification with various edge cases and fallbacks
 */

import { ethers } from 'ethers';
import { SignatureVerifier } from '../../validation/eip1271';

describe('Integration: Signature Verification', () => {
  let provider: ethers.JsonRpcProvider;
  let verifier: SignatureVerifier;
  let wallet: ethers.Wallet;

  beforeAll(() => {
    // Use local test provider
    provider = new ethers.JsonRpcProvider('http://localhost:8545');
    wallet = ethers.Wallet.createRandom().connect(provider);
    verifier = new SignatureVerifier(provider);
  });

  describe('EOA Signature Verification', () => {
    it('should verify valid EOA signature', async () => {
      const message = 'Test message for signature verification';
      const signature = await wallet.signMessage(message);

      const result = await verifier.verifySignature(
        message,
        signature,
        wallet.address
      );

      expect(result.isValid).toBe(true);
      expect(result.method).toBe('EOA');
      expect(result.signer?.toLowerCase()).toBe(wallet.address.toLowerCase());
    });

    it('should reject signature from wrong signer', async () => {
      const message = 'Test message';
      const signature = await wallet.signMessage(message);
      const wrongAddress = ethers.Wallet.createRandom().address;

      const result = await verifier.verifySignature(
        message,
        signature,
        wrongAddress
      );

      expect(result.isValid).toBe(false);
    });

    it('should handle invalid signature format', async () => {
      const message = 'Test message';
      const invalidSignature = '0xinvalid';

      const result = await verifier.verifySignature(
        message,
        invalidSignature,
        wallet.address
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should verify signature with special characters', async () => {
      const message = 'Test message with émojis 🚀 and spëcial chàrs!';
      const signature = await wallet.signMessage(message);

      const result = await verifier.verifySignature(
        message,
        signature,
        wallet.address
      );

      expect(result.isValid).toBe(true);
      expect(result.method).toBe('EOA');
    });

    it('should verify signature with very long message', async () => {
      const message = 'A'.repeat(10000); // Very long message
      const signature = await wallet.signMessage(message);

      const result = await verifier.verifySignature(
        message,
        signature,
        wallet.address
      );

      expect(result.isValid).toBe(true);
      expect(result.method).toBe('EOA');
    });

    it('should verify signature with empty message', async () => {
      const message = '';
      const signature = await wallet.signMessage(message);

      const result = await verifier.verifySignature(
        message,
        signature,
        wallet.address
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle signature with modified message', async () => {
      const originalMessage = 'Original message';
      const signature = await wallet.signMessage(originalMessage);
      const modifiedMessage = 'Modified message';

      const result = await verifier.verifySignature(
        modifiedMessage,
        signature,
        wallet.address
      );

      expect(result.isValid).toBe(false);
    });
  });

  describe('Address Normalization', () => {
    it('should handle checksummed addresses', async () => {
      const message = 'Test message';
      const signature = await wallet.signMessage(message);
      const checksummedAddress = ethers.getAddress(wallet.address);

      const result = await verifier.verifySignature(
        message,
        signature,
        checksummedAddress
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle lowercase addresses', async () => {
      const message = 'Test message';
      const signature = await wallet.signMessage(message);
      const lowercaseAddress = wallet.address.toLowerCase();

      const result = await verifier.verifySignature(
        message,
        signature,
        lowercaseAddress
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid address format', async () => {
      const message = 'Test message';
      const signature = await wallet.signMessage(message);
      const invalidAddress = '0xinvalid';

      const result = await verifier.verifySignature(
        message,
        signature,
        invalidAddress
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Batch Verification', () => {
    it('should verify multiple signatures in batch', async () => {
      const wallet2 = ethers.Wallet.createRandom();
      const wallet3 = ethers.Wallet.createRandom();

      const verifications = [
        {
          message: 'Message 1',
          signature: await wallet.signMessage('Message 1'),
          expectedSigner: wallet.address
        },
        {
          message: 'Message 2',
          signature: await wallet2.signMessage('Message 2'),
          expectedSigner: wallet2.address
        },
        {
          message: 'Message 3',
          signature: await wallet3.signMessage('Message 3'),
          expectedSigner: wallet3.address
        }
      ];

      const results = await verifier.verifySignatures(verifications);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.isValid)).toBe(true);
    });

    it('should handle mixed valid and invalid signatures', async () => {
      const wallet2 = ethers.Wallet.createRandom();

      const verifications = [
        {
          message: 'Valid message',
          signature: await wallet.signMessage('Valid message'),
          expectedSigner: wallet.address
        },
        {
          message: 'Invalid message',
          signature: await wallet.signMessage('Different message'),
          expectedSigner: wallet2.address // Wrong signer
        }
      ];

      const results = await verifier.verifySignatures(verifications);

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent verification requests', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => `Message ${i}`);
      const signatures = await Promise.all(
        messages.map(msg => wallet.signMessage(msg))
      );

      const verificationPromises = messages.map((msg, i) =>
        verifier.verifySignature(msg, signatures[i], wallet.address)
      );

      const results = await Promise.all(verificationPromises);

      expect(results).toHaveLength(10);
      expect(results.every(r => r.isValid)).toBe(true);
    });

    it('should handle signature with null bytes', async () => {
      const message = 'Message with \0 null byte';
      const signature = await wallet.signMessage(message);

      const result = await verifier.verifySignature(
        message,
        signature,
        wallet.address
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle different signature formats (compact)', async () => {
      const message = 'Test message';
      const signature = await wallet.signMessage(message);

      // Ensure signature is in correct format
      expect(signature).toMatch(/^0x[0-9a-fA-F]{130}$/);

      const result = await verifier.verifySignature(
        message,
        signature,
        wallet.address
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('EIP-1271 Smart Contract Wallet Simulation', () => {
    it('should attempt EIP-1271 verification for contract addresses', async () => {
      // Simulate a contract address (non-zero code)
      const contractAddress = '0x' + '1'.repeat(40);
      const message = 'Test message';
      const signature = await wallet.signMessage(message);

      // This will fail because it's not a real contract, but should try EIP-1271
      const result = await verifier.verifySignature(
        message,
        signature,
        contractAddress
      );

      // Expected to fail, but should have attempted verification
      expect(result.isValid).toBe(false);
    });

    it('should handle contract verification fallback', async () => {
      const contractAddress = '0x' + '2'.repeat(40);
      const message = 'Test message';
      const signature = await wallet.signMessage(message);

      const result = await verifier.verifySignature(
        message,
        signature,
        contractAddress
      );

      // Should attempt both EIP-1271 and fallback methods
      expect(result).toBeDefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle provider connection errors gracefully', async () => {
      // Create verifier with offline provider
      const offlineProvider = new ethers.JsonRpcProvider('http://localhost:9999');
      const offlineVerifier = new SignatureVerifier(offlineProvider);

      const message = 'Test message';
      const signature = await wallet.signMessage(message);

      // Should still verify EOA signatures without provider
      const result = await offlineVerifier.verifySignature(
        message,
        signature,
        wallet.address
      );

      // EOA verification should work even with offline provider
      expect(result.isValid).toBe(true);
    });

    it('should provide meaningful error messages', async () => {
      const message = 'Test message';
      const invalidSignature = '0x00';

      const result = await verifier.verifySignature(
        message,
        invalidSignature,
        wallet.address
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  describe('Performance Tests', () => {
    it('should verify signatures efficiently', async () => {
      const message = 'Performance test message';
      const signature = await wallet.signMessage(message);

      const startTime = Date.now();
      
      await verifier.verifySignature(message, signature, wallet.address);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle batch verification efficiently', async () => {
      const count = 50;
      const verifications = await Promise.all(
        Array.from({ length: count }, async (_, i) => {
          const msg = `Message ${i}`;
          return {
            message: msg,
            signature: await wallet.signMessage(msg),
            expectedSigner: wallet.address
          };
        })
      );

      const startTime = Date.now();
      
      await verifier.verifySignatures(verifications);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Batch should be reasonably fast
      expect(duration).toBeLessThan(5000);
    });
  });
});
