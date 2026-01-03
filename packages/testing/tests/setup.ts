import { afterEach } from "vitest";
import { cleanup } from "../src/index.js";

afterEach(async () => {
    await cleanup();
});
