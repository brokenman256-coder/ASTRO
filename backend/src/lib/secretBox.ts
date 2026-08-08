import crypto from "crypto";
import { env } from "./env";

// Encrypts admin-provided secrets (e.g. a custom AI provider API key) at
// rest in the database, using a server-only key that's never sent to the
// client. Without ENCRYPTION_KEY set, encryption is skipped and the caller
// falls back to env-var-configured providers instead - this never silently
// stores a key in plaintext.

function getKey(): Buffer | null {
  if (!env.encryptionKey) return null;
  return crypto.createHash("sha256").update(env.encryptionKey).digest();
}

export function encryptSecret(plain: string): string | null {
  const key = getKey();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string): string | null {
  const key = getKey();
  if (!key) return null;
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
