import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createCliProject, STORE_LIBRARIES } from "./cli-project.js";

const APPLICATION_ID = "com.gtkx.clirelativeroot";
const APP_DIR = "app";
const TEST_FILE = "bindings.test.ts";
const RUN_TIMEOUT = 300_000;
const VITEST_ENTRY = fileURLToPath(new URL("../../../node_modules/vitest/vitest.mjs", import.meta.url));
const VITEST_PLUGIN_MODULE = new URL("../dist/vitest-plugin.js", import.meta.url).href;

const CONFIG =
    `export default { applicationId: "${APPLICATION_ID}", libraries: ${JSON.stringify(STORE_LIBRARIES)} };\n`;

const VITEST_CONFIG = `import gtkx from ${JSON.stringify(VITEST_PLUGIN_MODULE)};

export default { plugins: [gtkx()], test: { include: [${JSON.stringify(TEST_FILE)}], maxWorkers: 1 } };
`;

const TEST_SOURCE = `import * as GLib from "@gtkx/gi/glib";
import { expect, it } from "vitest";

it("imports the generated bindings", () => {
    expect(GLib.MAJOR_VERSION).toBe(2);
});
`;

describe("gtkx vitest plugin (a root given relative to the working directory)", () => {
    it("completes the run", () => {
        using project = createCliProject({
            prefix: "gtkx-cli-relative-root-",
            config: CONFIG,
            hasStore: true,
            files: {
                [join(APP_DIR, "gtkx.config.ts")]: CONFIG,
                [join(APP_DIR, "vitest.config.ts")]: VITEST_CONFIG,
                [join(APP_DIR, TEST_FILE)]: TEST_SOURCE,
            },
        });
        const result = spawnSync(process.execPath, [VITEST_ENTRY, "run", "--root", APP_DIR], {
            cwd: project.root,
            encoding: "utf8",
            env: process.env,
            killSignal: "SIGKILL",
            timeout: RUN_TIMEOUT,
        });

        expect(result.signal).toBeNull();
        expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    });
});
