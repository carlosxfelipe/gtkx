import { vol } from "memfs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeBuildAllowance } from "../src/build-allowance.js";

const TEST_DIR = "/test-workspace";
const WORKSPACE_FILE = `${TEST_DIR}/pnpm-workspace.yaml`;
const MANIFEST_FILE = `${TEST_DIR}/package.json`;
const EXPECTED_WORKSPACE = "packages:\n  - '.'\nallowBuilds:\n  '@swc/core': true\n  esbuild: true\n";

function read(path: string): string {
    return vol.readFileSync(path, "utf8") as string;
}

function readManifest(): Record<string, unknown> {
    return JSON.parse(read(MANIFEST_FILE)) as Record<string, unknown>;
}

function writeManifest(manifest: Record<string, unknown>): void {
    vol.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 4)}\n`);
}

vi.mock("node:fs", async () => {
    const memfs = await vi.importActual<typeof import("memfs")>("memfs");

    return { ...memfs.fs, default: memfs.fs };
});

beforeEach(() => {
    vol.reset();
    vol.mkdirSync(TEST_DIR, { recursive: true });
});

describe("writeBuildAllowance (pnpm)", () => {
    it("writes the packages selection alongside the built dependencies", () => {
        writeBuildAllowance(TEST_DIR, "pnpm");
        expect(read(WORKSPACE_FILE)).toBe(EXPECTED_WORKSPACE);
    });

    it("replaces an existing pnpm-workspace.yaml instead of appending a second allowBuilds key", () => {
        vol.writeFileSync(WORKSPACE_FILE, "packages:\n  - '.'\nallowBuilds:\n  my-tool: true\n");
        writeBuildAllowance(TEST_DIR, "pnpm");
        const content = read(WORKSPACE_FILE);
        expect(content.match(/^allowBuilds:/gm)).toHaveLength(1);
        expect(content).toBe(EXPECTED_WORKSPACE);
    });
});

describe("writeBuildAllowance (yarn)", () => {
    it("marks every built dependency under dependenciesMeta", () => {
        writeManifest({ name: "app" });
        writeBuildAllowance(TEST_DIR, "yarn");

        expect(readManifest()).toEqual({
            name: "app",
            dependenciesMeta: { "@swc/core": { built: true }, esbuild: { built: true } },
        });
    });

    it("replaces a dependenciesMeta left by an earlier run", () => {
        writeManifest({ name: "app", dependenciesMeta: { "my-tool": { built: true } } });
        writeBuildAllowance(TEST_DIR, "yarn");

        expect(readManifest().dependenciesMeta).toEqual({
            "@swc/core": { built: true },
            esbuild: { built: true },
        });
    });

    it("leaves the rest of the manifest untouched", () => {
        writeManifest({ name: "app", dependencies: { react: "19.2.8" } });
        writeBuildAllowance(TEST_DIR, "yarn");
        expect(readManifest().dependencies).toEqual({ react: "19.2.8" });
    });
});

describe("writeBuildAllowance (npm)", () => {
    it("marks every built dependency under allowScripts", () => {
        writeManifest({ name: "app" });
        writeBuildAllowance(TEST_DIR, "npm");
        expect(readManifest()).toEqual({ name: "app", allowScripts: { "@swc/core": true, esbuild: true } });
    });

    it("replaces an allowScripts left by an earlier run", () => {
        writeManifest({ name: "app", allowScripts: { "my-tool": true } });
        writeBuildAllowance(TEST_DIR, "npm");
        expect(readManifest().allowScripts).toEqual({ "@swc/core": true, esbuild: true });
    });

    it("writes the manifest without leaving the pending file behind", () => {
        writeManifest({ name: "app" });
        writeBuildAllowance(TEST_DIR, "npm");
        expect(vol.existsSync(`${MANIFEST_FILE}.pending`)).toBe(false);
    });
});
