import { cleanup } from "@gtkx/testing";
import { afterAll, afterEach } from "vitest";

afterEach(async () => {
    await cleanup();
});

afterAll(async () => {
    await cleanup();
});
