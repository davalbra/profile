import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

console.log("--- Prisma Driver Adapter Initialization ---");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
console.log("Pool created");
const adapter = new PrismaPg(pool);
console.log("Adapter created");

const prismaClientSingleton = () => {
  console.log("Initializing PrismaClient...");
  const client = new PrismaClient({ adapter });
  return client;
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };
export default prisma as ReturnType<typeof prismaClientSingleton>;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
