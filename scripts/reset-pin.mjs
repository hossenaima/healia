/**
 * Reset an account's PIN.
 *
 * A PIN-only app has no email recovery by design, and the PIN is stored as a
 * scrypt hash — irreversible on purpose. So a forgotten PIN needs a new one
 * set directly, by someone who already has database access.
 *
 *   node scripts/reset-pin.mjs <name> <new-pin>
 *
 * Run it yourself rather than pasting a PIN into a chat window: whatever you
 * type here stays in your terminal.
 */
import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

const [, , rawName, newPin] = process.argv;

if (!rawName || !newPin) {
  console.error("usage: node scripts/reset-pin.mjs <name> <new-pin>");
  process.exit(1);
}
if (!/^\d{4,10}$/.test(newPin)) {
  console.error("PIN must be 4–10 digits, matching what the signup form accepts.");
  process.exit(1);
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("No DIRECT_URL or DATABASE_URL in the environment.");
  process.exit(1);
}

// Must match src/lib/auth.ts exactly, or the new PIN will not verify.
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(newPin, salt, 64).toString("hex");

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows } = await client.query(
  `UPDATE "User" SET "pinHash" = $1, "pinSalt" = $2, "updatedAt" = now()
   WHERE handle = $3
   RETURNING name`,
  [hash, salt, rawName.trim().toLowerCase()],
);

await client.end();

if (rows.length === 0) {
  console.error(`No account named "${rawName}".`);
  process.exit(1);
}
console.log(`PIN reset for ${rows[0].name}. Sign in with the new one.`);
