import { describe, expect, it } from "vitest";
import * as Gdk from "../src/generated/gdk/index.js";
import { getBoxed } from "../src/index.js";

describe("getBoxed", () => {
    it("wraps a native boxed type pointer in a class instance", () => {
        const rgba = new Gdk.RGBA({ red: 1.0, green: 0.5, blue: 0.0, alpha: 1.0 });
        const wrapped = getBoxed(rgba.id, Gdk.RGBA);
        expect(wrapped.red).toBeCloseTo(1.0);
        expect(wrapped.green).toBeCloseTo(0.5);
        expect(wrapped.blue).toBeCloseTo(0.0);
        expect(wrapped.alpha).toBeCloseTo(1.0);
    });

    it("sets the correct prototype chain", () => {
        const rgba = new Gdk.RGBA({ red: 0.5 });
        const wrapped = getBoxed(rgba.id, Gdk.RGBA);
        expect(typeof wrapped.toString).toBe("function");
        expect(typeof wrapped.copy).toBe("function");
    });

    describe("error handling", () => {
        it("throws when id is null", () => {
            expect(() => getBoxed(null, Gdk.RGBA)).toThrow("getBoxed: id cannot be null or undefined");
        });

        it("throws when id is undefined", () => {
            expect(() => getBoxed(undefined, Gdk.RGBA)).toThrow("getBoxed: id cannot be null or undefined");
        });
    });
});
