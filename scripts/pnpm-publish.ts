import { spawnSync } from "node:child_process";

const ALREADY_PUBLISHED = /cannot publish over|EPUBLISHCONFLICT|previously published version/i;

export const publishPackage = (packageDir: string, tag: string): void => {
    const provenance = process.env.NPM_CONFIG_PROVENANCE === "true" ? ["--provenance"] : [];
    const result = spawnSync(
        "pnpm",
        ["publish", "--access", "public", "--no-git-checks", ...provenance, "--tag", tag],
        {
            cwd: packageDir,
            stdio: ["inherit", "pipe", "pipe"],
            encoding: "utf8",
        },
    );
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    if (result.error) throw result.error;
    if (result.status === 0) return;
    if (ALREADY_PUBLISHED.test(`${result.stdout ?? ""}${result.stderr ?? ""}`)) {
        console.log(`${packageDir} is already published, skipping`);
        return;
    }
    throw new Error(`pnpm publish failed with exit code ${result.status ?? "unknown"}`);
};
