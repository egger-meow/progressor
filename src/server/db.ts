import { PrismaClient } from "@prisma/client";

// Next.js dev-mode hot reload re-evaluates modules on every request; without
// caching the client on `globalThis` each reload would open a new SQLite
// connection and eventually exhaust the pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
