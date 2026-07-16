import { animateValue, motionValue } from "motion-dom";
import { describe, expect, it } from "vitest";
import {
    motionWindow,
    onMatchMediaInit,
    type SyntheticEvent,
    SyntheticEventTarget,
    setReducedMotionMatches,
    setWindowMetrics,
} from "../src/motion-env.js";

describe("motion-env globals", () => {
    it("installs the browser globals motion requires", () => {
        expect(typeof globalThis.requestAnimationFrame).toBe("function");
        expect(typeof globalThis.cancelAnimationFrame).toBe("function");
        expect(globalThis.window).toBeDefined();
        expect(globalThis.document).toBeDefined();
        expect(typeof globalThis.Element).toBe("function");
        expect(typeof globalThis.HTMLElement).toBe("function");
        expect(typeof globalThis.HTMLButtonElement).toBe("function");
        expect(typeof globalThis.PointerEvent).toBe("function");
    });

    it("keeps the HTMLElement stub free of animate so WAAPI detection stays off", () => {
        expect(Object.hasOwn(globalThis.Element.prototype, "animate")).toBe(false);
        expect(new globalThis.HTMLElement()).toBeInstanceOf(globalThis.Element);
        expect(new globalThis.HTMLButtonElement()).toBeInstanceOf(globalThis.HTMLElement);
    });

    it("installs rAF before motion-dom captures it", async () => {
        const value = motionValue(0);
        const samples: number[] = [];
        value.on("change", (latest: number) => {
            samples.push(latest);
        });
        const animation = animateValue({
            keyframes: [0, 100],
            type: "spring",
            onUpdate: (latest: number) => value.set(latest),
        });
        await animation.finished;
        expect(samples.length).toBeGreaterThan(5);
        expect(Math.round(value.get())).toBe(100);
    });
});

describe("SyntheticEventTarget", () => {
    it("sets currentTarget for every listener invocation", () => {
        const target = new SyntheticEventTarget();
        const seen: unknown[] = [];
        target.addEventListener("pointerdown", (event) => seen.push(event.currentTarget));
        target.addEventListener("pointerdown", (event) => seen.push(event.currentTarget));
        target.dispatchEvent({ type: "pointerdown" });
        expect(seen).toEqual([target, target]);
    });

    it("sets target only when unset", () => {
        const target = new SyntheticEventTarget();
        const other = new SyntheticEventTarget();
        const targets: unknown[] = [];
        target.addEventListener("pointerup", (event) => targets.push(event.target));
        target.dispatchEvent({ type: "pointerup" });
        target.dispatchEvent({ type: "pointerup", target: other });
        expect(targets).toEqual([target, other]);
    });

    it("removes listeners when their abort signal fires", () => {
        const target = new SyntheticEventTarget();
        const controller = new AbortController();
        const received: SyntheticEvent[] = [];
        target.addEventListener("pointermove", (event) => received.push(event), { signal: controller.signal });
        target.dispatchEvent({ type: "pointermove" });
        controller.abort();
        target.dispatchEvent({ type: "pointermove" });
        expect(received).toHaveLength(1);
        expect(target.listenerCount("pointermove")).toBe(0);
    });

    it("ignores listeners registered with an already-aborted signal", () => {
        const target = new SyntheticEventTarget();
        const controller = new AbortController();
        controller.abort();
        target.addEventListener("pointermove", () => undefined, { signal: controller.signal });
        expect(target.listenerCount("pointermove")).toBe(0);
    });
});

describe("matchMedia bridge", () => {
    it("answers the reduced-motion query and delivers change events", () => {
        let initialized = 0;
        onMatchMediaInit(() => {
            initialized += 1;
        });
        const query = motionWindow.matchMedia("(prefers-reduced-motion)");
        expect(initialized).toBe(1);
        expect(query.matches).toBe(false);
        const changes: boolean[] = [];
        query.addEventListener("change", (event) => {
            changes.push(event.matches === true);
        });
        setReducedMotionMatches(true);
        expect(query.matches).toBe(true);
        setReducedMotionMatches(true);
        setReducedMotionMatches(false);
        expect(changes).toEqual([true, false]);
        onMatchMediaInit(() => {
            initialized += 1;
        });
        expect(initialized).toBe(2);
    });
});

describe("window metrics", () => {
    it("updates innerWidth and innerHeight", () => {
        setWindowMetrics({ innerWidth: 800 });
        expect(motionWindow.innerWidth).toBe(800);
        setWindowMetrics({ innerHeight: 600 });
        expect(motionWindow.innerHeight).toBe(600);
        expect(motionWindow.scrollX).toBe(0);
        expect(motionWindow.scrollY).toBe(0);
    });
});
