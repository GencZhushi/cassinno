import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Ensure database URL has pgbouncer=true for Supabase transaction pooler
const getDatabaseUrl = () => {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // If using Supabase transaction pooler (port 6543) and missing pgbouncer param
  if (url.includes(":6543") && !url.includes("pgbouncer=true")) {
    url += url.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
  }
  return url;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
