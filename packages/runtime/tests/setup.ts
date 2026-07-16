import { afterAll, beforeAll } from "vitest";

beforeAll(async () => {
    await import("@gtkx/runtime");
});

afterAll(async () => {
    const { quit } = await import("@gtkx/runtime");
    quit();
});
