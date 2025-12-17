import { describe, expect, it } from "vitest";
import { quit } from "../src/index.js";

describe("quit", () => {
    it("returns true (useful for signal handlers)", () => {
        const result = quit();
        expect(result).toBe(true);
    });

    it("handles quit when no container exists", () => {
        const result = quit();
        expect(result).toBe(true);
    });

    it("can be used as signal handler return value", () => {
        const handler = () => quit();
        const result = handler();
        expect(result).toBe(true);
    });
});
