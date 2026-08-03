import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  createSessionToken,
  userIdFromToken,
} from "@/lib/session";
import type { Units } from "@/lib/units";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export type SessionUser = {
  id: string;
  name: string;
  handle: string;
  goalWeightLbs: number | null;
  startWeightLbs: number | null;
  heightInches: number | null;
  units: Units;
};

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

/** "Aima " and "aima" are the same account. */
export function toHandle(name: string): string {
  return name.trim().toLowerCase();
}

// --- Session cookie --------------------------------------------------------

export async function startSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(userId), {
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

/**
 * The signed-in user, or null. The account is re-read from the database on
 * every call rather than trusted from the cookie, so a deleted account cannot
 * keep acting on a still-valid token.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = userIdFromToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    goalWeightLbs: user.goalWeightLbs,
    startWeightLbs: user.startWeightLbs,
    heightInches: user.heightInches,
    units: user.units === "kg" ? "kg" : "lb",
  };
}

/**
 * Guard for every server action and protected page. Proxy does an optimistic
 * cookie check, but server actions are reachable by direct POST, so the real
 * check has to live next to the data — and it returns the user, so callers are
 * pushed into scoping their queries rather than merely asserting auth.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/** True when at least one account exists — controls the first-run experience. */
export async function hasAnyUser(): Promise<boolean> {
  return (await prisma.user.count()) > 0;
}

/**
 * Signup is open by default so a second person can join, but setting
 * ALLOW_SIGNUP=false closes it once everyone who needs an account has one.
 * The first account is always allowed, otherwise the app could never be set up.
 */
export async function signupAllowed(): Promise<boolean> {
  if (process.env.ALLOW_SIGNUP === "false") {
    return !(await hasAnyUser());
  }
  return true;
}
