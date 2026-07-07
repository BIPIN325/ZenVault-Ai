/**
 * Cryptography Utility Module for ZenVault AI
 * 
 * Handles Zero-Knowledge encryption using native Web Crypto API.
 * Uses PBKDF2 for key derivation and AES-GCM for encryption/decryption.
 */

// We use a high number of iterations for PBKDF2 to slow down brute-force attacks.
const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Derives an AES-GCM 256 key from a plain text password and salt.
 * 
 * @param password The plain text master password.
 * @param salt The salt as a Uint8Array.
 * @returns A CryptoKey suitable for AES-GCM.
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // The key is non-extractable, meaning it cannot be exported from the CryptoKey object.
    ["encrypt", "decrypt"]
  );
}

/**
 * Imports a 32-byte raw key directly for AES-GCM (used for Biometric PRF).
 */
export async function importRawKey(keyMaterial: Uint8Array): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string using the provided AES-GCM key.
 * 
 * @param data The plain text data to encrypt.
 * @param key The AES-GCM CryptoKey.
 * @returns An object containing the base64 encoded ciphertext and IV.
 */
export async function encryptData(data: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
    },
    key,
    enc.encode(data)
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypts a base64 encoded ciphertext using the provided AES-GCM key and IV.
 * 
 * @param ciphertext The base64 encoded encrypted data.
 * @param iv The base64 encoded initialization vector.
 * @param key The AES-GCM CryptoKey.
 * @returns The decrypted plain text string.
 */
export async function decryptData(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder();
  const encryptedBuffer = base64ToBuffer(ciphertext);
  const ivBuffer = base64ToBuffer(iv);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer as BufferSource,
    },
    key,
    encryptedBuffer as BufferSource
  );

  return dec.decode(decryptedBuffer);
}

/**
 * Generates a random salt.
 * 
 * @returns A Uint8Array of length SALT_LENGTH.
 */
export function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Converts a Uint8Array to a base64 string.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts a base64 string to a Uint8Array.
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
