import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL para inicializar Prisma.");
}

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === "production" ? 10 : 4,
  });

const adapter = new PrismaPg(pool);

function hasExpectedDelegates(client: PrismaClient | undefined): client is PrismaClient {
  if (!client) {
    return false;
  }

  const dynamicClient = client as unknown as Record<string, unknown>;
  return (
    typeof dynamicClient.usuario === "object" &&
    typeof dynamicClient.sesionFirebase === "object" &&
    typeof dynamicClient.configuracionAcceso === "object" &&
    typeof dynamicClient.correoAutorizado === "object"
  );
}

const cachedPrisma = hasExpectedDelegates(globalForPrisma.prisma) ? globalForPrisma.prisma : undefined;

export const prisma =
  cachedPrisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = pool;
}
