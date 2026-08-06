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
  //
  // TLS has to be asked for. node-postgres defaults to a plain TCP socket, so
  // without this every weigh-in, meal and PIN hash crossed the public internet
  // between Vercel and Supabase in the clear. Verified by inspecting the
  // client socket: unset it and you get a raw socket, set it and you get
  // TLSv1.3 / TLS_AES_256_GCM_SHA384.
  //
  // `rejectUnauthorized: false` because Supabase's pooler presents a
  // self-signed chain that the system CA store will not verify. That buys
  // encryption against eavesdropping but not authentication of the endpoint;
  // pinning their CA would close that and is worth doing if this ever holds
  // anyone else's data.
  const adapter = new PrismaPg({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
