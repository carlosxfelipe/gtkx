import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { join } from "node:path";

import type { TestProject } from "vitest/node";

const getRuntimeDir = (): string => process.env.XDG_RUNTIME_DIR ?? tmpdir();

const getStateDir = (): string => {
    const existingDir = process.env.GTKX_STATE_DIR;

    if (existingDir) {
        return existingDir;
    }

    return join(getRuntimeDir(), `gtkx-vitest-${process.pid}`);
};

const waitForDisplay = (display: number, timeout = 5000): Promise<boolean> =>
    new Promise((resolve) => {
        const start = Date.now();

        const check = (): void => {
            const lockFile = `/tmp/.X${display}-lock`;

            if (existsSync(lockFile)) {
                resolve(true);
                return;
            }

            if (Date.now() - start > timeout) {
                resolve(false);
                return;
            }

            setTimeout(check, 50);
        };

        check();
    });

const startXvfb = async (display: number): Promise<ChildProcess | null> => {
    const xvfb = spawn("Xvfb", [`:${display}`, "-screen", "0", "1024x768x24"], {
        stdio: "ignore",
        detached: true,
    });

    xvfb.unref();

    const ready = await waitForDisplay(display);

    if (!ready) {
        xvfb.kill();
        return null;
    }

    return xvfb;
};

const getBaseDisplay = (): number => {
    const slot = process.pid % 500;
    return 50 + slot * 10;
};

const xvfbProcesses: ChildProcess[] = [];
let stateDir: string;

export const setup = async (project: TestProject): Promise<void> => {
    stateDir = getStateDir();
    const configuredWorkers = project.config.maxWorkers;
    const maxWorkers = typeof configuredWorkers === "number" ? configuredWorkers : availableParallelism();

    if (existsSync(stateDir)) {
        rmSync(stateDir, { recursive: true, force: true });
    }

    mkdirSync(stateDir, { recursive: true });

    const baseDisplay = getBaseDisplay();
    const displays: number[] = [];
    const results = await Promise.all(Array.from({ length: maxWorkers }, (_, i) => startXvfb(baseDisplay + i)));

    for (let i = 0; i < results.length; i++) {
        const xvfb = results[i];

        if (xvfb) {
            xvfbProcesses.push(xvfb);
            displays.push(baseDisplay + i);
        }
    }

    if (displays.length === 0) {
        throw new Error("Failed to start any Xvfb instances");
    }

    for (const display of displays) {
        writeFileSync(join(stateDir, `display-${display}.available`), "");
    }

    process.env.GTKX_STATE_DIR = stateDir;
};

export const teardown = (): void => {
    for (const xvfb of xvfbProcesses) {
        try {
            xvfb.kill("SIGTERM");
        } catch {}
    }

    if (stateDir && existsSync(stateDir)) {
        rmSync(stateDir, { recursive: true, force: true });
    }
};
