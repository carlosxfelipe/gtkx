import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { UserConfig } from "vite";
import type { Plugin } from "vitest/config";
import { compileSchemas } from "../gsettings/compile.js";
import { findSchemaFiles, prependSchemaDir, stageSchema } from "../gsettings/schema.js";
import { resolveDataDir } from "../internal/data-dir.js";
import { removeTempDir } from "../internal/staging-dir.js";

const compileProjectSchemas = (root: string): string | null => {
    const dataDir = resolveDataDir(root);
    if (dataDir === null) return null;

    const schemaFiles = findSchemaFiles(join(root, dataDir));
    if (schemaFiles.length === 0) return null;

    const dir = mkdtempSync(join(tmpdir(), "gtkx-schemas-"));
    process.once("exit", () => removeTempDir(dir));
    for (const filePath of schemaFiles) stageSchema(dir, filePath);
    compileSchemas(dir);
    return dir;
};

export function gtkxGSettingsWorkerEnv(): Plugin {
    return {
        name: "gtkx:gsettings-worker-env",
        enforce: "pre",

        config(config: UserConfig) {
            const dir = compileProjectSchemas(config.root ?? process.cwd());
            if (dir === null) return;

            process.env.GTKX_DEV_SCHEMA_DIR = dir;

            return {
                test: {
                    env: { GSETTINGS_SCHEMA_DIR: prependSchemaDir(dir, process.env.GSETTINGS_SCHEMA_DIR) },
                },
            };
        },
    };
}
