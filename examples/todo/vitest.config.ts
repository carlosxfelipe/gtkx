import { mergeConfig } from "vitest/config";
import baseConfig from "../../vitest.config.js";

export default mergeConfig(baseConfig, {
    test: {
        include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
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
        setupFiles: ["./tests/setup.ts"],
    },
});
