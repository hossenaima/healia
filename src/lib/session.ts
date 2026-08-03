import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Session token verification, kept free of database and `server-only` imports
 * so `proxy.ts` can use it without pulling Prisma into the proxy bundle.
 *
 * Format: `<expiresAtMs>.<hmac>`. There is only ever one user, so the token
 * carries no identity — just an expiry the server can verify it issued.
 */

export const SESSION_COOKIE = "healia_session";
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

export function createSessionToken(): string {
  const payload = String(Date.now() + SESSION_DAYS * 86_400_000);
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
