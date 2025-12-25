import { afterAll, afterEach } from "vitest";
import { cleanup, teardown } from "../src/index.js";

afterEach(async () => {
    await cleanup();
});

afterAll(async () => {
    await teardown();
});
