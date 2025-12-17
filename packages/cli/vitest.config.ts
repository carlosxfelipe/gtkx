import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.{ts,tsx}"],
        typecheck: {
            tsconfig: "tsconfig.test.json",
        },
        pool: "forks",
        maxWorkers: 1,
        isolate: true,
        fileParallelism: false,
        sequence: {
            hooks: "list",
        },
        globalSetup: "./tests/setup.ts",
        setupFiles: ["./tests/vitest-setup.ts"],
    },
});
