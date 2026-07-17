import type { UserConfig } from "vite";
import type { Plugin } from "vitest/config";
import { prependSchemaDir, stageAndCompileProjectSchemas } from "../gsettings/schema.js";
import { resolveDataDir } from "../internal/data-dir.js";

export function gtkxGSettingsWorkerEnv(): Plugin {
    return {
        name: "gtkx:gsettings-worker-env",
        enforce: "pre",

        config(config: UserConfig) {
            const root = config.root ?? process.cwd();
            const dir = stageAndCompileProjectSchemas(root, resolveDataDir(root));
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
