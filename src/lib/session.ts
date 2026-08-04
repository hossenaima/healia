import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Session token verification, kept free of database and `server-only` imports
 * so `proxy.ts` can use it without pulling Prisma into the proxy bundle.
 *
 * Format: `<userId>.<expiresAtMs>.<hmac>`. The signature covers both the user
 * id and the expiry, so a token cannot be edited to impersonate another account
 * or to extend its own life.
 */

export const SESSION_COOKIE = "helia_session";
export const SESSION_DAYS = 90;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set to a random string of at least 16 characters in production.",
    );
  }
  return "dev-only-insecure-session-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function createSessionToken(userId: string): string {
  const payload = `${userId}.${Date.now() + SESSION_DAYS * 86_400_000}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Returns the user id the token vouches for, or null if it is missing, forged,
 * or expired. Callers must treat null as "not signed in".
 */
export function userIdFromToken(token: string | undefined): string | null {
  if (!token) return null;

  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;

  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);

  const expected = sign(payload);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const split = payload.lastIndexOf(".");
  if (split <= 0) return null;

  const userId = payload.slice(0, split);
  const expiresAt = Number(payload.slice(split + 1));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  return userId || null;
}

/** Cheap check for the proxy, which only needs to know if a session looks valid. */
export function isValidSessionToken(token: string | undefined): boolean {
  return userIdFromToken(token) !== null;
}
