import gtkx from "@gtkx/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [gtkx()],
    test: {
        include: ["tests/**/*.test.{ts,tsx}"],
        globals: false,
        testTimeout: 30000,
    },
});
