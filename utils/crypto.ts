import { timingSafeEqual } from "@std/crypto/timing-safe-equal";
import { decodeBase64, encodeBase64 } from "@std/encoding/base64";

export function safeCompare(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function hashToken(token: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ENCRYPTION_ALGORITHM = "AES-GCM";

async function getEncryptionKey(keyString: string): Promise<CryptoKey> {
  const keyBytes = decodeBase64(keyString);
  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: ENCRYPTION_ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPassword(password: string, keyString: string): Promise<string> {
  const key = await getEncryptionKey(keyString);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedPassword = new TextEncoder().encode(password);

  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    encodedPassword,
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const resultBytes = new Uint8Array(iv.length + encryptedBytes.length);
  resultBytes.set(iv, 0);
  resultBytes.set(encryptedBytes, iv.length);

  return encodeBase64(resultBytes);
}

export async function decryptPassword(encryptedPassword: string, keyString: string): Promise<string> {
  const key = await getEncryptionKey(keyString);
  const encryptedBytes = decodeBase64(encryptedPassword);

  const iv = encryptedBytes.slice(0, 12);
  const data = encryptedBytes.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    data,
  );

  return new TextDecoder().decode(decrypted);
}
