import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Stored Clerk user id — deterministic AES-256-GCM so rows stay queryable. */
const USER_STORE_PREFIX = "u1";

/** Saved link URL — random IV per row. */
const LINK_URL_PREFIX = "l1";

let cachedKey: Buffer | null = null;
let warnedDevFallback = false;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  let raw = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (process.env.NODE_ENV !== "development") {
      throw new Error(
        "FIELD_ENCRYPTION_KEY is required (64 hex chars or base64 encoding 32 bytes).",
      );
    }
    if (!warnedDevFallback) {
      console.warn(
        "[coredesk] FIELD_ENCRYPTION_KEY is unset; using a fixed development-only key. Set FIELD_ENCRYPTION_KEY in .env.local (64 hex chars) before production.",
      );
      warnedDevFallback = true;
    }
    raw = createHash("sha256")
      .update("coredesk:dev-only-field-encryption-v1")
      .digest("hex");
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    cachedKey = Buffer.from(raw, "hex");
    return cachedKey;
  }
  const fromB64 = Buffer.from(raw, "base64");
  if (fromB64.length === 32) {
    cachedKey = fromB64;
    return cachedKey;
  }
  throw new Error(
    "FIELD_ENCRYPTION_KEY must be 64 hex characters or base64 for a 32-byte key.",
  );
}

function deterministicUserIv(clerkUserId: string, key: Buffer): Buffer {
  return createHash("sha256")
    .update(key)
    .update("\0coredesk:user-id\0")
    .update(clerkUserId, "utf8")
    .digest()
    .subarray(0, 12);
}

function sealGcm(key: Buffer, iv: Buffer, plaintext: Buffer): Buffer {
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

function openGcm(key: Buffer, sealed: Buffer): Buffer {
  const iv = sealed.subarray(0, 12);
  const tag = sealed.subarray(12, 28);
  const ciphertext = sealed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/** Deterministic ciphertext per Clerk user id — use for INSERT and WHERE. */
export function encryptUserIdForStorage(clerkUserId: string): string {
  const key = loadKey();
  const iv = deterministicUserIv(clerkUserId, key);
  const sealed = sealGcm(key, iv, Buffer.from(clerkUserId, "utf8"));
  return `${USER_STORE_PREFIX}:${sealed.toString("base64url")}`;
}

export function decryptUserIdFromStorage(stored: string): string {
  if (!stored.startsWith(`${USER_STORE_PREFIX}:`)) return stored;
  const sealed = Buffer.from(stored.slice(USER_STORE_PREFIX.length + 1), "base64url");
  const plain = openGcm(loadKey(), sealed);
  return plain.toString("utf8");
}

export function isStoredUserIdEncrypted(stored: string): boolean {
  return stored.startsWith(`${USER_STORE_PREFIX}:`);
}

/** Encrypt link URL for saved_links.url */
export function encryptLinkUrl(plainUrl: string): string {
  const key = loadKey();
  const iv = randomBytes(12);
  const sealed = sealGcm(key, iv, Buffer.from(plainUrl, "utf8"));
  return `${LINK_URL_PREFIX}:${sealed.toString("base64url")}`;
}

export function decryptLinkUrl(stored: string): string {
  if (!stored.startsWith(`${LINK_URL_PREFIX}:`)) return stored;
  const sealed = Buffer.from(stored.slice(LINK_URL_PREFIX.length + 1), "base64url");
  const plain = openGcm(loadKey(), sealed);
  return plain.toString("utf8");
}

export function isLinkUrlEncrypted(stored: string): boolean {
  return stored.startsWith(`${LINK_URL_PREFIX}:`);
}
