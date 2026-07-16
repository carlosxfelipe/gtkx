import { describe, expect, it } from "vitest";
import { parseViewportMargin, reachesViewportAmount } from "../src/features/in-view.js";

describe("parseViewportMargin", () => {
    it("returns zero margins when no margin is given", () => {
        expect(parseViewportMargin(undefined)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
        expect(parseViewportMargin("")).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    });

    it("applies a single value to all sides", () => {
        expect(parseViewportMargin("10px")).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
    });

    it("applies two values as vertical and horizontal", () => {
        expect(parseViewportMargin("10px 20px")).toEqual({ top: 10, right: 20, bottom: 10, left: 20 });
    });

    it("applies four values clockwise", () => {
        expect(parseViewportMargin("1px 2px 3px 4px")).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    });

    it("supports negative and fractional pixel values", () => {
        expect(parseViewportMargin("-10px 2.5px")).toEqual({ top: -10, right: 2.5, bottom: -10, left: 2.5 });
    });

    it("treats non-pixel values as zero", () => {
        expect(parseViewportMargin("50%")).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
        expect(parseViewportMargin("50% 10px")).toEqual({ top: 0, right: 10, bottom: 0, left: 10 });
    });
});

describe("reachesViewportAmount", () => {
    it("requires any overlap by default", () => {
        expect(reachesViewportAmount(undefined, 0, 0)).toBe(false);
        expect(reachesViewportAmount(undefined, 0.01, 1)).toBe(true);
        expect(reachesViewportAmount("some", 0.01, 1)).toBe(true);
    });

    it("requires full visibility for all", () => {
        expect(reachesViewportAmount("all", 0.9, 100)).toBe(false);
        expect(reachesViewportAmount("all", 0.9995, 100)).toBe(true);
    });

    it("compares numeric amounts against the visible ratio", () => {
        expect(reachesViewportAmount(0.5, 0.49, 100)).toBe(false);
        expect(reachesViewportAmount(0.5, 0.5, 100)).toBe(true);
    });
});
