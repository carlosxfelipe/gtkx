import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Plugin } from "vitest/config";

const getRuntimeDir = (): string => process.env.XDG_RUNTIME_DIR ?? tmpdir();

const getStateDir = (): string => join(getRuntimeDir(), `gtkx-vitest-${process.pid}`);

/**
 * Creates the GTKX Vitest plugin for running GTK tests.
 *
 * Manages Xvfb virtual display instances for headless GTK testing.
 * Each worker thread gets its own display to avoid interference.
 *
 * @returns Vitest plugin configuration
 *
 * @example
 * ```ts
 * // vitest.config.ts
 * import { defineConfig } from "vitest/config";
 * import gtkx from "@gtkx/vitest";
 *
 * export default defineConfig({
 *   plugins: [gtkx()],
 * });
 * ```
 */
const gtkx = (): Plugin => {
    const workerSetupPath = join(import.meta.dirname, "setup.js");
    const globalSetupPath = join(import.meta.dirname, "global-setup.js");
    const stateDir = getStateDir();

    return {
        name: "gtkx",
        config(config) {
            const setupFiles = config.test?.setupFiles ?? [];
            const globalSetup = config.test?.globalSetup ?? [];

            process.env.GTKX_STATE_DIR = stateDir;

            return {
                test: {
                    globalSetup: [globalSetupPath, ...(Array.isArray(globalSetup) ? globalSetup : [globalSetup])],
                    setupFiles: [workerSetupPath, ...(Array.isArray(setupFiles) ? setupFiles : [setupFiles])],
                    pool: "forks",
                },
            };
        },
    };
};

export default gtkx;
