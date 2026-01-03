import { afterEach, beforeAll } from "vitest";
import { start } from "./lifecycle.js";

afterEach(() => {
    if (global.gc) {
        global.gc();
    }
});

beforeAll(() => {
    start();
});
