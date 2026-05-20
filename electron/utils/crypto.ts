import crypto from 'node:crypto';

/**
 * AES-256-GCM encryption utilities for secure credential storage.
 *
 * All encryption/decryption runs in the Electron main process only.
 * The encryption key is derived from the machine ID via PBKDF2,
 * ensuring that encrypted data is bound to the current machine.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const CURRENT_VERSION = 1;

export interface EncryptedData {
  /** Base64 encoded ciphertext */
  ciphertext: string;
  /** Base64 encoded initialization vector (12 bytes) */
  iv: string;
  /** Base64 encoded GCM authentication tag (16 bytes) */
  tag: string;
  /** Encryption scheme version for future migration support */
  version: number;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt
 * @param key - 32-byte encryption key
 * @returns EncryptedData object with Base64-encoded fields
 */
export function encrypt(plaintext: string, key: Buffer): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    version: CURRENT_VERSION,
  };
}

/**
 * Decrypt an EncryptedData object back to the original plaintext.
 *
 * @param encrypted - The encrypted data object
 * @param key - 32-byte encryption key (must match the key used for encryption)
 * @returns The original plaintext string
 * @throws Error if version is unsupported or decryption fails (tampered data)
 */
export function decrypt(encrypted: EncryptedData, key: Buffer): string {
  if (encrypted.version !== CURRENT_VERSION) {
    throw new Error(`Unsupported encryption version: ${encrypted.version}`);
  }

  const iv = Buffer.from(encrypted.iv, 'base64');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Derive a 256-bit encryption key from a machine ID and salt using PBKDF2.
 *
 * @param machineId - Unique machine identifier (from node-machine-id)
 * @param salt - Application-specific salt string
 * @returns 32-byte derived key
 */
export function deriveKey(machineId: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(machineId, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}
