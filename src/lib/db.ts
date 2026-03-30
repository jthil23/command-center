import { PrismaClient } from "../../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const url = new URL(dbUrl);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: parseInt(url.port, 10) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });
  return new PrismaClient({ adapter });
}

// Lazy proxy to avoid instantiation at build time (DATABASE_URL not available)
let _prisma: PrismaClient | undefined;

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_prisma) {
      _prisma = globalForPrisma.prisma ?? createPrismaClient();
      if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _prisma;
    }
    return Reflect.get(_prisma, prop);
  },
});
