/**
 * EIP-1271 Signature Verification with robust fallback checks
 * 
 * Implements signature verification for both EOA (Externally Owned Accounts)
 * and smart contract wallets (EIP-1271).
 */

import { ethers } from 'ethers';
import { SignatureVerificationResult } from '../types';

// EIP-1271 magic value
const EIP1271_MAGIC_VALUE = '0x1626ba7e';

// EIP-1271 interface ABI
const EIP1271_ABI = [
  'function isValidSignature(bytes32 _hash, bytes _signature) public view returns (bytes4 magicValue)'
];

export class SignatureVerifier {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  /**
   * Verify a signature with comprehensive fallback logic
   * 
   * @param message - Original message that was signed
   * @param signature - Signature to verify
   * @param expectedSigner - Expected signer address
   * @returns Verification result with method used
   */
  async verifySignature(
    message: string,
    signature: string,
    expectedSigner: string
  ): Promise<SignatureVerificationResult> {
    try {
      // Normalize addresses
      const normalizedSigner = ethers.getAddress(expectedSigner);

      // First, try EOA verification (cheapest and most common)
      const eoaResult = await this.verifyEOASignature(message, signature, normalizedSigner);
      if (eoaResult.isValid) {
        return eoaResult;
      }

      // If EOA verification fails, check if it's a contract
      const code = await this.provider.getCode(normalizedSigner);
      const isContract = code !== '0x' && code.length > 2;

      if (isContract) {
        // Try EIP-1271 verification for smart contract wallets
        const eip1271Result = await this.verifyEIP1271Signature(
          message,
          signature,
          normalizedSigner
        );
        if (eip1271Result.isValid) {
          return eip1271Result;
        }

        // Fallback: Try with prefixed message for EIP-1271
        const fallbackResult = await this.verifyEIP1271WithPrefix(
          message,
          signature,
          normalizedSigner
        );
        if (fallbackResult.isValid) {
          return fallbackResult;
        }
      }

      // All methods failed
      return {
        isValid: false,
        method: 'FALLBACK',
        error: 'Signature verification failed for all methods'
      };
    } catch (error) {
      return {
        isValid: false,
        method: 'FALLBACK',
        error: error instanceof Error ? error.message : 'Unknown error during verification'
      };
    }
  }

  /**
   * Verify signature for Externally Owned Account (EOA)
   */
  private async verifyEOASignature(
    message: string,
    signature: string,
    expectedSigner: string
  ): Promise<SignatureVerificationResult> {
    try {
      // Try with ethers standard message hashing
      const messageHash = ethers.hashMessage(message);
      const recoveredAddress = ethers.recoverAddress(messageHash, signature);

      if (recoveredAddress.toLowerCase() === expectedSigner.toLowerCase()) {
        return {
          isValid: true,
          signer: recoveredAddress,
          method: 'EOA'
        };
      }

      // Try without prefix (raw signature)
      const messageBytes = ethers.toUtf8Bytes(message);
      const rawHash = ethers.keccak256(messageBytes);
      const recoveredRaw = ethers.recoverAddress(rawHash, signature);

      if (recoveredRaw.toLowerCase() === expectedSigner.toLowerCase()) {
        return {
          isValid: true,
          signer: recoveredRaw,
          method: 'EOA'
        };
      }

      return {
        isValid: false,
        method: 'EOA',
        error: 'Recovered address does not match expected signer'
      };
    } catch (error) {
      return {
        isValid: false,
        method: 'EOA',
        error: error instanceof Error ? error.message : 'EOA verification failed'
      };
    }
  }

  /**
   * Verify signature using EIP-1271 for smart contract wallets
   */
  private async verifyEIP1271Signature(
    message: string,
    signature: string,
    contractAddress: string
  ): Promise<SignatureVerificationResult> {
    try {
      const contract = new ethers.Contract(contractAddress, EIP1271_ABI, this.provider);
      
      // Hash the message
      const messageHash = ethers.hashMessage(message);
      
      // Call isValidSignature on the contract
      const magicValue = await contract.isValidSignature(messageHash, signature);

      if (magicValue === EIP1271_MAGIC_VALUE) {
        return {
          isValid: true,
          signer: contractAddress,
          method: 'EIP1271'
        };
      }

      return {
        isValid: false,
        method: 'EIP1271',
        error: `Invalid magic value returned: ${magicValue}`
      };
    } catch (error) {
      return {
        isValid: false,
        method: 'EIP1271',
        error: error instanceof Error ? error.message : 'EIP-1271 verification failed'
      };
    }
  }

  /**
   * Fallback: Try EIP-1271 with different message prefixing
   */
  private async verifyEIP1271WithPrefix(
    message: string,
    signature: string,
    contractAddress: string
  ): Promise<SignatureVerificationResult> {
    try {
      const contract = new ethers.Contract(contractAddress, EIP1271_ABI, this.provider);
      
      // Try with raw message hash (no prefix)
      const messageBytes = ethers.toUtf8Bytes(message);
      const rawHash = ethers.keccak256(messageBytes);
      
      const magicValue = await contract.isValidSignature(rawHash, signature);

      if (magicValue === EIP1271_MAGIC_VALUE) {
        return {
          isValid: true,
          signer: contractAddress,
          method: 'FALLBACK'
        };
      }

      return {
        isValid: false,
        method: 'FALLBACK',
        error: 'EIP-1271 fallback verification failed'
      };
    } catch (error) {
      return {
        isValid: false,
        method: 'FALLBACK',
        error: error instanceof Error ? error.message : 'Fallback verification failed'
      };
    }
  }

  /**
   * Batch verify multiple signatures
   */
  async verifySignatures(
    verifications: Array<{
      message: string;
      signature: string;
      expectedSigner: string;
    }>
  ): Promise<SignatureVerificationResult[]> {
    return Promise.all(
      verifications.map(v =>
        this.verifySignature(v.message, v.signature, v.expectedSigner)
      )
    );
  }
}
