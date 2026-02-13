import {PrismaClient} from "@prisma/client";
import pg from "pg";
import {PrismaPg} from "@prisma/adapter-pg";

const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});
const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
    return new PrismaClient({adapter});
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export {prisma};
export default prisma as ReturnType<typeof prismaClientSingleton>;

if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = prisma;
}
