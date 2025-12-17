import { describe, expect, it } from "vitest";
import { reconciler } from "../src/index.js";

describe("reconciler", () => {
    it("returns a valid reconciler object", () => {
        expect(reconciler).toBeDefined();
        expect(typeof reconciler).toBe("object");
    });

    it("returns the same instance on repeated access", () => {
        const first = reconciler;
        const second = reconciler;
        expect(first).toBe(second);
    });

    it("getInstance() provides access to react-reconciler API", () => {
        const instance = reconciler.getInstance();

        expect(instance).toBeDefined();
        expect(typeof instance.createContainer).toBe("function");
        expect(typeof instance.updateContainer).toBe("function");
        expect(typeof instance.flushPassiveEffects).toBe("function");
    });
});
