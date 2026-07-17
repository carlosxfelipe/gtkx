import * as Graphene from "@gtkx/gi/graphene";
import * as Gtk from "@gtkx/gi/gtk";
import type { MotionNodeOptions } from "motion-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyFor } from "../src/bridge/widget-proxy.js";
import { GtkInViewFeature, parseViewportMargin, reachesViewportAmount } from "../src/features/in-view.js";

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

const createInViewFeature = (widget: Gtk.Widget, viewport: MotionNodeOptions["viewport"] = {}) => {
    const onViewportEnter = vi.fn();
    const onViewportLeave = vi.fn();
    const setActive = vi.fn();
    const props: MotionNodeOptions = { viewport, onViewportEnter, onViewportLeave };
    const node = {
        current: proxyFor(widget),
        props,
        prevProps: props,
        animationState: { setActive },
        getProps: () => props,
    };
    return { feature: new GtkInViewFeature(node), onViewportEnter, onViewportLeave, setActive };
};

const buildScrolledFixture = () => {
    const scrolled = new Gtk.ScrolledWindow();
    const label = new Gtk.Label();
    scrolled.setChild(label);
    return { scrolled, label };
};

const boundsAt = (x: number, y: number): [boolean, Graphene.Rect] => [true, new Graphene.Rect().init(x, y, 10, 10)];

const mockViewportGeometry = (label: Gtk.Label, scrolled: Gtk.ScrolledWindow) => {
    vi.spyOn(label, "getMapped").mockReturnValue(true);
    const boundsSpy = vi.spyOn(label, "computeBounds").mockReturnValue(boundsAt(0, 0));
    vi.spyOn(scrolled, "getWidth").mockReturnValue(100);
    vi.spyOn(scrolled, "getHeight").mockReturnValue(100);
    return boundsSpy;
};

describe("GtkInViewFeature", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const expectAdjustmentSignalEvaluates = (emitSignal: (scrolled: Gtk.ScrolledWindow) => void): void => {
        const { scrolled, label } = buildScrolledFixture();
        const { feature } = createInViewFeature(label);
        feature.mount();
        const mappedSpy = vi.spyOn(label, "getMapped").mockReturnValue(false);

        emitSignal(scrolled);

        expect(mappedSpy).toHaveBeenCalled();
        feature.unmount();
    };

    it("re-evaluates when an adjustment range changes", () => {
        expectAdjustmentSignalEvaluates((scrolled) => scrolled.getHadjustment().emit("changed"));
    });

    it("re-evaluates when an adjustment value changes", () => {
        expectAdjustmentSignalEvaluates((scrolled) => scrolled.getVadjustment().emit("value-changed"));
    });

    it("stops re-evaluating adjustment signals after unmount", () => {
        const { scrolled, label } = buildScrolledFixture();
        const { feature } = createInViewFeature(label);
        feature.mount();
        feature.unmount();
        const mappedSpy = vi.spyOn(label, "getMapped");

        scrolled.getHadjustment().emit("changed");
        scrolled.getVadjustment().emit("value-changed");

        expect(mappedSpy).not.toHaveBeenCalled();
    });

    it("emits enter and leave as range changes move the widget across the viewport", () => {
        const { scrolled, label } = buildScrolledFixture();
        const { feature, onViewportEnter, onViewportLeave, setActive } = createInViewFeature(label);
        const boundsSpy = mockViewportGeometry(label, scrolled);
        feature.mount();

        scrolled.getHadjustment().emit("changed");
        expect(onViewportEnter).toHaveBeenCalledTimes(1);
        expect(setActive).toHaveBeenCalledWith("whileInView", true);

        boundsSpy.mockReturnValue(boundsAt(500, 500));
        scrolled.getHadjustment().emit("changed");
        expect(onViewportLeave).toHaveBeenCalledTimes(1);
        expect(setActive).toHaveBeenCalledWith("whileInView", false);
        feature.unmount();
    });

    it("stops scheduling frame evaluations once a once viewport has entered", () => {
        vi.useFakeTimers();
        const { scrolled, label } = buildScrolledFixture();
        const { feature, onViewportEnter } = createInViewFeature(label, { once: true });
        mockViewportGeometry(label, scrolled);

        const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame");
        feature.mount();
        expect(rafSpy).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(100);
        expect(onViewportEnter).toHaveBeenCalledTimes(1);

        rafSpy.mockClear();
        feature.mount();
        expect(rafSpy).not.toHaveBeenCalled();
        feature.unmount();
    });
});
