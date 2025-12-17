import { describe, expect, it } from "vitest";
import { createRef } from "../src/index.js";

describe("createRef", () => {
    it("creates a ref object for FFI values", () => {
        const ref = createRef(0);
        expect(ref).toBeDefined();
        expect(typeof ref).toBe("object");
    });

    it("initial value is accessible", () => {
        const ref = createRef(42);
        expect(ref.value).toBe(42);
    });

    it("value can be updated", () => {
        const ref = createRef(10);
        expect(ref.value).toBe(10);

        ref.value = 20;
        expect(ref.value).toBe(20);
    });
});
