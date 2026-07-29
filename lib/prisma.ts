import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Stashed on globalThis so dev-mode hot reload reuses one client/connection
// pool instead of opening a new one on every edit (same reasoning as the
// old in-memory store's globalThis stash in lib/store.ts).
interface PrismaGlobal {
  __prisma?: PrismaClient;
}

const prismaGlobal = globalThis as PrismaGlobal;

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — add a Postgres connection string to .env (see prisma/schema.prisma)."
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = prismaGlobal.__prisma ?? (prismaGlobal.__prisma = createClient());
