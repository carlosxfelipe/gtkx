import { existsSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const GTKX_STATE_DIR = process.env.GTKX_STATE_DIR;
const MAX_CLAIM_ATTEMPTS = 100;
const CLAIM_RETRY_DELAY_MS = 100;

if (!GTKX_STATE_DIR) {
    throw new Error("GTKX_STATE_DIR not set - gtkx plugin must be used");
}

const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));

const sleepSync = (ms: number): void => {
    Atomics.wait(sleepBuffer, 0, 0, ms);
};

const tryClaimDisplay = (): number | null => {
    if (!existsSync(GTKX_STATE_DIR)) {
        return null;
    }

    const files = readdirSync(GTKX_STATE_DIR).filter((f) => f.endsWith(".available"));

    for (const file of files) {
        const display = Number.parseInt(file.replace("display-", "").replace(".available", ""), 10);
        const availablePath = join(GTKX_STATE_DIR, file);
        const claimedPath = join(GTKX_STATE_DIR, `display-${display}.claimed-${process.pid}`);

        try {
            renameSync(availablePath, claimedPath);
            return display;
        } catch {
            // File may have been claimed by another worker, try next
        }
    }

    return null;
};

const claimDisplay = (): number | null => {
    for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
        const display = tryClaimDisplay();

        if (display !== null) {
            return display;
        }

        sleepSync(CLAIM_RETRY_DELAY_MS);
    }

    return null;
};

const releaseDisplay = (display: number): void => {
    const claimedPath = join(GTKX_STATE_DIR, `display-${display}.claimed-${process.pid}`);
    const availablePath = join(GTKX_STATE_DIR, `display-${display}.available`);

    try {
        renameSync(claimedPath, availablePath);
    } catch {
        // File may already be released or cleaned up by teardown
    }
};

const display = claimDisplay();

if (display === null) {
    throw new Error("Failed to claim display - ensure gtkx plugin is configured");
}

process.env.GDK_BACKEND = "x11";
process.env.GSK_RENDERER = "cairo";
process.env.LIBGL_ALWAYS_SOFTWARE = "1";
process.env.DISPLAY = `:${display}`;

const cleanup = (): void => {
    releaseDisplay(display);
};

process.on("exit", cleanup);
process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
});
process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
});
