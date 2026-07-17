import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach } from "vitest";

const dataHome = mkdtempSync(join(tmpdir(), "gtkx-tutorial-"));

process.env.XDG_DATA_HOME = dataHome;

beforeEach(() => {
    rmSync(join(dataHome, "com.gtkx.tutorial"), { recursive: true, force: true });
});

afterAll(() => {
    rmSync(dataHome, { recursive: true, force: true });
});
