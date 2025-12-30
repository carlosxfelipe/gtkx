import { execSync } from "node:child_process";
import { existsSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const GTKX_STATE_DIR = process.env.GTKX_STATE_DIR;
const MAX_CLAIM_ATTEMPTS = 100;
const CLAIM_RETRY_DELAY_MS = 100;

if (!GTKX_STATE_DIR) {
    throw new Error("GTKX_STATE_DIR not set - gtkx plugin must be used");
}

const sleepSync = (ms: number): void => {
    execSync(`sleep ${ms / 1000}`, { stdio: "ignore" });
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
        } catch {}
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
    } catch {}
};

process.env.GDK_BACKEND = "x11";
process.env.GSK_RENDERER = "cairo";
process.env.LIBGL_ALWAYS_SOFTWARE = "1";
process.env.NO_AT_BRIDGE = "1";

const display = claimDisplay();

if (display === null) {
    throw new Error("Failed to claim display - globalSetup may not have run");
}

process.env.DISPLAY = `:${display}`;

process.on("exit", () => releaseDisplay(display));

process.on("SIGTERM", () => {
    releaseDisplay(display);
    process.exit(0);
});

process.on("SIGINT", () => {
    releaseDisplay(display);
    process.exit(0);
});
