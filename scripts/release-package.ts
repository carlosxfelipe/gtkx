import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { distTagForVersion, type PackageManifest, stripDevArtifacts } from "./publish-manifest.js";

const findRepoRoot = (start: string): string => {
    let dir = start;
    while (!existsSync(join(dir, "pnpm-workspace.yaml"))) {
        const parent = dirname(dir);
        if (parent === dir) throw new Error("Could not locate the monorepo root (pnpm-workspace.yaml)");
        dir = parent;
    }
    return dir;
};

const releasePackage = (): void => {
    const packageDir = process.cwd();
    const root = findRepoRoot(packageDir);
    copyFileSync(join(root, "README.md"), join(packageDir, "README.md"));

    const manifestPath = join(packageDir, "package.json");
    const original = readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(original) as PackageManifest;
    writeFileSync(manifestPath, `${JSON.stringify(stripDevArtifacts(manifest), null, 4)}\n`);
    const tag = distTagForVersion(manifest.version ?? "");

    try {
        const result = spawnSync(
            "pnpm",
            ["publish", "--access", "public", "--no-git-checks", "--provenance", "--tag", tag],
            {
                cwd: packageDir,
                stdio: ["inherit", "pipe", "pipe"],
                encoding: "utf8",
            },
        );
        process.stdout.write(result.stdout ?? "");
        process.stderr.write(result.stderr ?? "");
        if (result.error) throw result.error;
        if (result.status !== 0) {
            const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
            const alreadyPublished = /cannot publish over|EPUBLISHCONFLICT|previously published version/i.test(output);
            if (alreadyPublished) {
                console.log(`${manifest.name ?? "package"}@${manifest.version ?? ""} is already published, skipping`);
            } else {
                throw new Error(`pnpm publish failed with exit code ${result.status ?? "unknown"}`);
            }
        }
    } finally {
        writeFileSync(manifestPath, original);
    }
};

releasePackage();
