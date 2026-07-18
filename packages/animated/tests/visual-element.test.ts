import * as Gtk from "@gtkx/gi/gtk";
import { animateVisualElement, type MotionNodeOptions, motionValue, type TargetAndTransition } from "motion-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { animationStyleSheet } from "../src/animation-css-provider.js";
import { proxyFor } from "../src/bridge/widget-proxy.js";
import { createGtkRenderState } from "../src/build-gtk-styles.js";
import { GtkVisualElement } from "../src/gtk-visual-element.js";

const asProps = (props: Record<string, unknown>): MotionNodeOptions => props;

const createElement = (className: string, props: Record<string, unknown> = {}): GtkVisualElement =>
    new GtkVisualElement(
        {
            visualState: { latestValues: {}, renderState: createGtkRenderState() },
            props,
            presenceContext: null,
            reducedMotionConfig: "never",
            blockInitialAnimation: false,
        },
        { className },
    );

describe("GtkVisualElement", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("reads opacity from the widget and transform defaults for transform keys", () => {
        const widget = new Gtk.Box();
        widget.opacity = 0.75;
        const proxy = proxyFor(widget);
        const element = createElement("gtkx-anim-read");
        expect(element.readValueFromInstance(proxy, "opacity")).toBeCloseTo(0.75, 2);
        expect(element.readValueFromInstance(proxy, "x")).toBe(0);
        expect(element.readValueFromInstance(proxy, "scale")).toBe(1);
        expect(element.readValueFromInstance(proxy, "backgroundColor")).toBeUndefined();
    });

    it("reads base targets and motion values from the style prop", () => {
        const styleValue = motionValue(12);
        const element = createElement("gtkx-anim-style");
        expect(element.getBaseTargetFromProps(asProps({ style: { opacity: 0.5 } }), "opacity")).toBe(0.5);
        expect(element.getBaseTargetFromProps(asProps({ style: { x: styleValue } }), "x")).toBe(styleValue);
        expect(element.getBaseTargetFromProps(asProps({}), "opacity")).toBeUndefined();
        const scraped = element.scrapeMotionValuesFromProps(
            asProps({ style: { x: styleValue, opacity: 0.5 } }),
            asProps({}),
        );
        expect(scraped.x).toBe(styleValue);
        expect(scraped.opacity).toBeUndefined();
    });

    it("merges static style under animated values when building", () => {
        const element = createElement("gtkx-anim-build");
        const state = createGtkRenderState();
        element.build(state, { opacity: 0.25 }, asProps({ style: { opacity: 0.9, backgroundColor: "#336699" } }));
        expect(state.style.opacity).toBe(0.25);
        expect(state.style.backgroundColor).toBe("#336699");
    });

    it("measures an unrealized widget as an empty box", () => {
        const widget = new Gtk.Box();
        const element = createElement("gtkx-anim-measure");
        const box = element.measureInstanceViewportBox(proxyFor(widget));
        expect(box.x.max).toBeGreaterThanOrEqual(box.x.min);
        expect(box.y.max).toBeGreaterThanOrEqual(box.y.min);
    });

    it("animates through the sheet end-to-end", async () => {
        const widget = new Gtk.Box();
        const element = createElement("gtkx-anim-e2e");
        element.mount(proxyFor(widget));
        const setSpy = vi.spyOn(animationStyleSheet, "set");
        const definition: Record<string, unknown> = { opacity: 0.5, transition: { duration: 0.05 } };
        await animateVisualElement(element, definition as TargetAndTransition);
        const rules = setSpy.mock.calls.map((call) => String(call[1]));
        expect(rules.some((rule) => rule.includes(".gtkx-anim-e2e"))).toBe(true);
        expect(rules.at(-1)).toContain("opacity: 0.5;");
        element.unmount();
    });
});
