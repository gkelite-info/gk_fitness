import bcrypt from 'bcryptjs';
import * as Crypto from 'expo-crypto';

// Provide cryptographically secure PRNG for React Native / Hermes where global WebCrypto is not present
try {
  bcrypt.setRandomFallback((len: number): number[] => {
    try {
      if (Crypto && typeof Crypto.getRandomBytes === 'function') {
        const bytes = Crypto.getRandomBytes(len);
        return Array.from(bytes);
      }
    } catch (cryptoErr) {
      console.warn('[passwordHelper] Crypto.getRandomBytes failed, using fallback:', cryptoErr);
    }

    const arr: number[] = [];
    for (let i = 0; i < len; i++) {
      arr.push(Math.floor(Math.random() * 256));
    }
    return arr;
  });
} catch (e) {
  console.warn('[passwordHelper] Failed to register bcrypt random fallback:', e);
}

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt with 10 salt rounds ($2b$10$...).
 */
export async function hashPassword(password: string): Promise<string> {
  const cleanPassword = password.trim();

  return new Promise((resolve, reject) => {
    try {
      const salt = bcrypt.genSaltSync(BCRYPT_SALT_ROUNDS);
      const hash = bcrypt.hashSync(cleanPassword, salt);
      resolve(hash);
    } catch (err) {
      bcrypt.hash(cleanPassword, BCRYPT_SALT_ROUNDS, (asyncErr, asyncHash) => {
        if (asyncErr || !asyncHash) {
          reject(err || asyncErr);
        } else {
          resolve(asyncHash);
        }
      });
    }
  });
}

/**
 * Verifies a plaintext password against a stored hash.
 * Supports:
 *  1. Bcrypt ($2a$, $2b$, $2y$)
 *  2. Legacy SHA-256 (64 hex characters) for seamless backward compatibility
 *  3. Plaintext fallback
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  const rawPassword = password;
  const trimmedPassword = password.trim();

  // 1. Bcrypt hash check ($2a$, $2b$, $2y$)
  if (
    storedHash.startsWith('$2a$') ||
    storedHash.startsWith('$2b$') ||
    storedHash.startsWith('$2y$')
  ) {
    try {
      if (bcrypt.compareSync(rawPassword, storedHash)) return true;
      if (bcrypt.compareSync(trimmedPassword, storedHash)) return true;
    } catch (bcryptErr) {
      console.warn('[passwordHelper] Bcrypt comparison error:', bcryptErr);
    }
  }

  // 2. Legacy SHA-256 hash fallback (64 hex chars)
  try {
    const sha = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawPassword);
    const shaTrimmed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, trimmedPassword);
    if (storedHash === sha || storedHash === shaTrimmed) {
      return true;
    }
  } catch (shaErr) {
    console.warn('[passwordHelper] SHA-256 fallback error:', shaErr);
  }

  // 3. Plaintext fallback (if legacy unhashed record existed)
  if (storedHash === rawPassword || storedHash === trimmedPassword) {
    return true;
  }

  return false;
}
