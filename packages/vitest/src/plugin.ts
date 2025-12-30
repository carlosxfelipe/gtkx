import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

const getStateDir = (projectRoot: string): string => {
    const hash = createHash("md5").update(projectRoot).digest("hex").slice(0, 8);
    return join(tmpdir(), `gtkx-vitest-${hash}`);
};

export interface GtkxOptions {
    /**
     * Additional setup files to run after the GTKX worker setup.
     * These files will be loaded after the display is configured.
     */
    setupFiles?: string[];
}

/**
 * Vitest plugin for GTKX applications.
 *
 * This plugin configures Vitest to run GTK tests with proper display isolation:
 * - Starts Xvfb instances for headless display (one per worker)
 * - Sets GTK environment variables automatically
 * - Configures test pool for process isolation
 *
 * When using `@gtkx/testing`, no additional setup is needed - the `render()`
 * function handles GTK application lifecycle automatically.
 *
 * @example
 * ```typescript
 * // vitest.config.ts
 * import gtkx from "@gtkx/vitest";
 *
 * export default defineConfig({
 *     plugins: [gtkx()],
 *     test: {
 *         include: ["tests/**\/*.test.{ts,tsx}"],
 *     },
 * });
 * ```
 */
const gtkx = (options?: GtkxOptions): Plugin => {
    const workerSetupPath = join(__dirname, "worker-setup.js");
    const globalSetupPath = join(__dirname, "global-setup.js");
    const userSetupFiles = options?.setupFiles ?? [];

    return {
        name: "gtkx",
        config(config) {
            const existingGlobalSetup = config.test?.globalSetup ?? [];

            const projectRoot = config.root ?? process.cwd();
            const stateDir = getStateDir(projectRoot);
            process.env.GTKX_STATE_DIR = stateDir;

            return {
                test: {
                    globalSetup: [
                        ...(Array.isArray(existingGlobalSetup) ? existingGlobalSetup : [existingGlobalSetup]),
                        globalSetupPath,
                    ],
                    setupFiles: [workerSetupPath, ...userSetupFiles],
                    pool: "forks",
                    maxWorkers: 1,
                },
                esbuild: {
                    jsx: "automatic",
                },
            };
        },
    };
};

export default gtkx;
