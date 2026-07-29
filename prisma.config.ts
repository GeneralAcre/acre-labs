import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

// Used by `prisma migrate`/`prisma studio` etc. — the running app connects
// via the driver adapter in lib/prisma.ts instead, per Prisma 7's split
// between CLI (Migrate) and runtime (Client) connection config.
export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"),
  },
});
