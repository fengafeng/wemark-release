/**
 * Type definitions for secure (encrypted) storage.
 *
 * EncryptedData is the on-disk format for AES-256-GCM encrypted values.
 * SecureStoreBridge is the interface exposed to the Nitro server via
 * globalThis.__wemarkSecureStore when running inside Electron.
 */

/** On-disk representation of an AES-256-GCM encrypted value. */
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

/** Result of a set/delete operation on the secure store. */
export interface SecureStoreResult {
  success: boolean;
  error?: string;
}

/**
 * Bridge interface exposed via globalThis.__wemarkSecureStore.
 *
 * Allows the Nitro server (running in the same Electron process)
 * to access the encrypted store without importing Electron modules.
 */
export interface SecureStoreBridge {
  /** Read and decrypt a value from the secure store. Returns undefined if not found. */
  getEncrypted: (key: string) => Promise<unknown>;
  /** Encrypt and write a value to the secure store. */
  setEncrypted: (key: string, value: unknown) => Promise<SecureStoreResult>;
  /** Delete a value from the secure store. */
  deleteEncrypted: (key: string) => Promise<SecureStoreResult>;
}

declare global {
  // eslint-disable-next-line no-var
  var __wemarkSecureStore: SecureStoreBridge | undefined;
}
