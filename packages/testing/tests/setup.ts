import { afterAll, afterEach } from "vitest";
import { cleanup } from "../src/index.js";

afterEach(async () => {
    await cleanup();
});

afterAll(async () => {
    await cleanup();
});
