import { describe, expect, it } from "vitest";
import { isTargetEqual, splitTarget } from "../src/animation-target.js";

describe("splitTarget", () => {
    it("separates values from the embedded transition", () => {
        const { values, transition } = splitTarget({ opacity: 1, x: 5, transition: { duration: 0 } });

        expect(values).toEqual({ opacity: 1, x: 5 });
        expect(transition).toEqual({ duration: 0 });
    });

    it("returns an undefined transition when none is embedded", () => {
        const { values, transition } = splitTarget({ opacity: 0.5 });

        expect(values).toEqual({ opacity: 0.5 });
        expect(transition).toBeUndefined();
    });
});

describe("isTargetEqual", () => {
    it("treats identical references and matching undefined as equal", () => {
        const target = { opacity: 1 };

        expect(isTargetEqual(target, target)).toBe(true);
        expect(isTargetEqual(undefined, undefined)).toBe(true);
        expect(isTargetEqual(target, undefined)).toBe(false);
    });

    it("compares values shallowly", () => {
        expect(isTargetEqual({ opacity: 1, x: 5 }, { opacity: 1, x: 5 })).toBe(true);
        expect(isTargetEqual({ opacity: 1 }, { opacity: 0.5 })).toBe(false);
        expect(isTargetEqual({ opacity: 1 }, { opacity: 1, x: 5 })).toBe(false);
    });

    it("compares embedded transitions shallowly", () => {
        const withTransition = { opacity: 1, transition: { duration: 0.1 } };

        expect(isTargetEqual(withTransition, { opacity: 1, transition: { duration: 0.1 } })).toBe(true);
        expect(isTargetEqual(withTransition, { opacity: 1, transition: { duration: 0.2 } })).toBe(false);
        expect(isTargetEqual(withTransition, { opacity: 1 })).toBe(false);
    });
});
