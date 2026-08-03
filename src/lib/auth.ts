import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  createSessionToken,
  isValidSessionToken,
} from "@/lib/session";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

// --- PIN hashing -----------------------------------------------------------

export async function hashPin(pin: string, salt?: string) {
  const useSalt = salt ?? randomBytes(16).toString("hex");
  const derived = await scryptAsync(pin, useSalt, 64);
  return { hash: derived.toString("hex"), salt: useSalt };
}

export async function verifyPin(pin: string, hash: string, salt: string) {
  const { hash: candidate } = await hashPin(pin, salt);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// --- Session cookie --------------------------------------------------------

export async function startSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * True once a PIN has been set. Before that the app is in first-run setup and
 * anyone reaching it is allowed to claim it by choosing a PIN.
 */
export async function isSetupComplete(): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return Boolean(settings?.pinHash && settings?.pinSalt);
}

/**
 * Guard for every server action and protected page. Proxy does an optimistic
 * cookie check, but server actions are reachable by direct POST, so the real
 * check has to live next to the data.
 */
export async function requireAuth() {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
}
