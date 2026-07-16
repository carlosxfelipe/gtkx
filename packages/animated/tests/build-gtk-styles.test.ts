import * as Gtk from "@gtkx/gi/gtk";
import { describe, expect, it } from "vitest";
import { buildGtkStyles, createGtkRenderState, serializeGtkRule } from "../src/build-gtk-styles.js";

const ruleFor = (latestValues: Record<string, string | number>): string => {
    const state = createGtkRenderState();
    buildGtkStyles(state, latestValues);
    return serializeGtkRule("anim", state);
};

const parseErrors = (css: string): string[] => {
    const provider = new Gtk.CssProvider();
    const errors: string[] = [];
    provider.on("parsing-error", (_section: unknown, error: { message?: string }) => {
        errors.push(String(error?.message ?? "parse error"));
    });
    provider.loadFromString(css);
    return errors;
};

describe("buildGtkStyles + serializeGtkRule", () => {
    it("serializes individual transform values into one transform declaration", () => {
        const rule = ruleFor({ x: 10, y: 4, scale: 1.2, rotate: 3, skewX: 1 });
        expect(rule).toContain("transform:");
        expect(rule).toContain("translateX(10px)");
        expect(rule).toContain("translateY(4px)");
        expect(rule).toContain("scale(1.2)");
        expect(rule).toContain("rotate(3deg)");
        expect(rule).toContain("skewX(1deg)");
    });

    it("resets transform to none when transform values disappear", () => {
        const state = createGtkRenderState();
        buildGtkStyles(state, { x: 10 });
        buildGtkStyles(state, {});
        expect(serializeGtkRule("anim", state)).toContain("transform: none;");
    });

    it("strips the z component from transform-origin", () => {
        const rule = ruleFor({ x: 5, originX: 0.25, originY: "75%" });
        expect(rule).toContain("transform-origin: 25% 75%;");
        expect(rule).not.toContain("75% 0");
    });

    it("applies px value types and dash-cases style keys", () => {
        const rule = ruleFor({
            opacity: 0.5,
            backgroundColor: "#336699",
            borderRadius: 8,
            margin: 4,
            fontSize: 14,
        });
        expect(rule).toContain("opacity: 0.5;");
        expect(rule).toContain("background-color: #336699;");
        expect(rule).toContain("border-radius: 8px;");
        expect(rule).toContain("margin: 4px;");
        expect(rule).toContain("font-size: 14px;");
    });

    it("maps visibility hidden to opacity 0", () => {
        const state = createGtkRenderState();
        buildGtkStyles(state, { opacity: 0.8 });
        state.style.visibility = "hidden";
        const rule = serializeGtkRule("anim", state);
        expect(rule).toContain("opacity: 0;");
        expect(rule).not.toContain("visibility");
        expect(rule).not.toContain("0.8");
    });

    it("drops style keys GTK CSS cannot express", () => {
        const rule = ruleFor({ opacity: 1, width: 100, pointerEvents: "none" });
        expect(rule).not.toContain("width");
        expect(rule).not.toContain("pointer-events");
        expect(rule).toContain("opacity: 1;");
    });

    it("returns an empty rule when nothing is expressible", () => {
        expect(ruleFor({})).toBe("");
        expect(ruleFor({ width: 100 })).toBe("");
    });

    it("produces CSS that GTK parses without error across the supported value set", () => {
        const state = createGtkRenderState();
        buildGtkStyles(state, {
            x: 10,
            y: 4,
            scale: 1.2,
            scaleX: 1.1,
            scaleY: 0.9,
            rotate: 3,
            skewX: 1,
            skewY: 2,
            originX: 0.25,
            originY: 0.75,
            opacity: 0.5,
            color: "rgba(10, 20, 30, 0.5)",
            backgroundColor: "#336699",
            borderColor: "rgb(1, 2, 3)",
            caretColor: "#ff0000",
            outlineColor: "#00ff00",
            borderRadius: 8,
            borderWidth: 2,
            minWidth: 10,
            minHeight: 10,
            margin: 4,
            padding: 4,
            fontSize: 14,
            letterSpacing: 1,
            filter: "blur(4px)",
            boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.3)",
        });
        const rule = serializeGtkRule("anim", state);
        expect(parseErrors(rule)).toEqual([]);
    });
});
