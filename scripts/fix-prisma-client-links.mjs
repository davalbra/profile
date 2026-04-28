import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);

function exists(targetPath) {
    return fs.existsSync(targetPath);
}

function ensurePrismaClientLink() {
    const clientPackageJson = require.resolve("@prisma/client/package.json", {
        paths: [process.cwd()],
    });
    const clientDir = path.dirname(clientPackageJson);
    const nodeModulesDir = path.resolve(clientDir, "..", "..");
    const prismaGeneratedDir = path.join(nodeModulesDir, ".prisma");
    const prismaClientLink = path.join(clientDir, ".prisma");

    if (!exists(prismaGeneratedDir)) {
        console.warn(
            `[fix-prisma-client-links] No se encontró ${prismaGeneratedDir}. Ejecuta "pnpm prisma generate" primero.`,
        );
        return;
    }

    const relativeTarget = path.relative(clientDir, prismaGeneratedDir);

    if (exists(prismaClientLink)) {
        const linkStats = fs.lstatSync(prismaClientLink);
        if (linkStats.isSymbolicLink()) {
            const currentTarget = fs.readlinkSync(prismaClientLink);
            if (currentTarget === relativeTarget) {
                console.log("[fix-prisma-client-links] Link .prisma ya está correcto.");
                return;
            }
        }

        fs.rmSync(prismaClientLink, {recursive: true, force: true});
    }

    fs.symlinkSync(relativeTarget, prismaClientLink, "dir");
    console.log(`[fix-prisma-client-links] Link creado: ${prismaClientLink} -> ${relativeTarget}`);
}

ensurePrismaClientLink();
