import {PrismaClient} from "@prisma/client";
import pg from "pg";
import {PrismaPg} from "@prisma/adapter-pg";

const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});
const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
    return new PrismaClient({adapter});
};

function hasTradingModels(client: PrismaClient): boolean {
    const maybeClient = client as unknown as Record<string, unknown>;
    return (
        typeof maybeClient.tradingFuturesSchedulerConfig === "object" &&
        typeof maybeClient.tradingFuturesRunHistory === "object" &&
        typeof maybeClient.tradingFuturesBacktestHistory === "object" &&
        typeof maybeClient.song === "object" &&
        typeof maybeClient.lyricsSet === "object" &&
        typeof maybeClient.lyricsLine === "object"
    );
}

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
    prismaGlobalSchemaTag: string | undefined;
} & typeof global;
const PRISMA_SCHEMA_TAG = "2026-03-lyrics-sync-v1";

const shouldReuseGlobal =
    globalThis.prismaGlobal &&
    globalThis.prismaGlobalSchemaTag === PRISMA_SCHEMA_TAG &&
    hasTradingModels(globalThis.prismaGlobal);

const prisma: ReturnType<typeof prismaClientSingleton> = shouldReuseGlobal
    ? (globalThis.prismaGlobal as ReturnType<typeof prismaClientSingleton>)
    : prismaClientSingleton();

export {prisma};
export default prisma as ReturnType<typeof prismaClientSingleton>;

if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = prisma;
    globalThis.prismaGlobalSchemaTag = PRISMA_SCHEMA_TAG;
}
