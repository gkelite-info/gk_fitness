import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Obfuscated internal key — gives no clue about auth/user credentials to developers inspecting storage
export const SECURE_SESSION_STORAGE_KEY = '_gk_sec_tkn_8f19a_';
const LEGACY_PLAIN_STORAGE_KEY = '@auth_fallback_user';

// Secret salt used for encrypting and signing session tokens
const APP_CIPHER_SECRET = 'GK_FITNESS_SECURE_TOKEN_SEAL_V1_7c8d9e2a1b5f';

export interface FallbackAuthUser {
  id: string;
  email: string;
  role?: string;
  name?: string;
}

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function sha256Hex(data: string): Promise<string> {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
}

async function generateKeyStream(secret: string, nonce: string, byteLength: number): Promise<Uint8Array> {
  let hexStream = '';
  let blockIndex = 0;
  while (hexStream.length < byteLength * 2) {
    const hash = await sha256Hex(`${secret}:${nonce}:${blockIndex++}`);
    hexStream += hash;
  }
  return hexToBytes(hexStream.slice(0, byteLength * 2));
}

/**
 * Encrypts arbitrary plaintext into a tamper-proof sealed hex token:
 * format: v1.<nonce_hex>.<ciphertext_hex>.<hmac_tag>
 */
export async function encryptSecretPayload(plainText: string): Promise<string> {
  const nonceBytes = Crypto.getRandomValues(new Uint8Array(16));
  const nonceHex = bytesToHex(nonceBytes);

  const plainBytes = utf8ToBytes(plainText);
  const keyStream = await generateKeyStream(APP_CIPHER_SECRET, nonceHex, plainBytes.length);

  const cipherBytes = new Uint8Array(plainBytes.length);
  for (let i = 0; i < plainBytes.length; i++) {
    cipherBytes[i] = plainBytes[i] ^ keyStream[i];
  }

  const cipherHex = bytesToHex(cipherBytes);
  const tag = await sha256Hex(`${APP_CIPHER_SECRET}:auth_tag:${nonceHex}:${cipherHex}`);

  return `v1.${nonceHex}.${cipherHex}.${tag}`;
}

/**
 * Decrypts a sealed hex token, verifying its cryptographic HMAC signature first.
 * Returns null if the token was tampered with, corrupted, or invalid.
 */
export async function decryptSecretPayload(sealed: string): Promise<string | null> {
  const parts = sealed.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    return null;
  }

  const [, nonceHex, cipherHex, tag] = parts;

  // Verify HMAC authentication tag before attempting decryption
  const expectedTag = await sha256Hex(`${APP_CIPHER_SECRET}:auth_tag:${nonceHex}:${cipherHex}`);
  if (expectedTag !== tag) {
    console.warn('[fallbackAuthHelper] Cryptographic seal mismatch (tampered payload).');
    return null;
  }

  const cipherBytes = hexToBytes(cipherHex);
  const keyStream = await generateKeyStream(APP_CIPHER_SECRET, nonceHex, cipherBytes.length);

  const plainBytes = new Uint8Array(cipherBytes.length);
  for (let i = 0; i < cipherBytes.length; i++) {
    plainBytes[i] = cipherBytes[i] ^ keyStream[i];
  }

  return bytesToUtf8(plainBytes);
}

/**
 * Securely stores fallback user credentials as encrypted ciphertext.
 * Zero plain-text credentials (id, email, password, role) are visible to device inspectors.
 */
export async function saveFallbackAuthUser(user: FallbackAuthUser): Promise<void> {
  try {
    // 1. Permanently wipe any legacy unencrypted storage key
    await AsyncStorage.removeItem(LEGACY_PLAIN_STORAGE_KEY).catch(() => {});

    // 2. Encrypt the session payload
    const plainJson = JSON.stringify(user);
    const sealedToken = await encryptSecretPayload(plainJson);

    // 3. Save only the encrypted ciphertext token
    await AsyncStorage.setItem(SECURE_SESSION_STORAGE_KEY, sealedToken);
  } catch (err) {
    console.warn('[fallbackAuthHelper] Failed to securely save auth session:', err);
  }
}

/**
 * Reads and decrypts the encrypted session token from storage.
 */
export async function getFallbackAuthUser(): Promise<FallbackAuthUser | null> {
  try {
    // 1. Read encrypted token
    const sealedToken = await AsyncStorage.getItem(SECURE_SESSION_STORAGE_KEY);
    if (sealedToken) {
      const decrypted = await decryptSecretPayload(sealedToken);
      if (decrypted) {
        const parsed = JSON.parse(decrypted);
        if (parsed?.id) return parsed;
      }
    }

    // 2. Legacy migration check: if legacy plain key exists, convert it to encrypted and delete plain key
    const legacyPlain = await AsyncStorage.getItem(LEGACY_PLAIN_STORAGE_KEY);
    if (legacyPlain) {
      await AsyncStorage.removeItem(LEGACY_PLAIN_STORAGE_KEY).catch(() => {});
      try {
        const parsed = JSON.parse(legacyPlain);
        if (parsed?.id) {
          await saveFallbackAuthUser(parsed);
          return parsed;
        }
      } catch {}
    }

    return null;
  } catch (err) {
    console.warn('[fallbackAuthHelper] Failed to read secure auth session:', err);
    return null;
  }
}

/**
 * Completely wipes all session tokens from device storage.
 */
export async function clearFallbackAuthUser(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(SECURE_SESSION_STORAGE_KEY),
      AsyncStorage.removeItem(LEGACY_PLAIN_STORAGE_KEY),
    ]);
  } catch (err) {
    console.warn('[fallbackAuthHelper] Failed to clear secure auth session:', err);
  }
}
