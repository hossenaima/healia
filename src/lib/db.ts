import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Next dev reloads modules on every edit; without this the process would leak a
// new connection pool per reload and eventually exhaust the database's
// connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }

  // Runtime uses the pooled connection. Migrations go through DIRECT_URL
  // instead — see prisma.config.ts — because the transaction pooler cannot
  // run the session-level statements that DDL requires.
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
