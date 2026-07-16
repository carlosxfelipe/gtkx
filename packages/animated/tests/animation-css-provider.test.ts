import * as Gtk from "@gtkx/gi/gtk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { animationStyleSheet } from "../src/animation-css-provider.js";

const drain = (): Promise<void> => Promise.resolve();

const seedRules = (...names: string[]): void => {
    for (const [index, name] of names.entries()) {
        animationStyleSheet.set(name, `.${name} { opacity: 0.${5 - index}; }`);
    }
};

const lastLoadedCss = (loadSpy: { mock: { calls: unknown[][] } }): string => String(loadSpy.mock.calls[0]?.[0]);

describe("animationStyleSheet", () => {
    afterEach(async () => {
        animationStyleSheet.remove("gtkx-anim-a");
        animationStyleSheet.remove("gtkx-anim-b");
        await drain();
        vi.restoreAllMocks();
    });

    it("coalesces multiple sets into one flush", async () => {
        const loadSpy = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");

        seedRules("gtkx-anim-a", "gtkx-anim-b");
        await drain();

        expect(loadSpy).toHaveBeenCalledTimes(1);
        const css = lastLoadedCss(loadSpy);
        expect(css).toContain("gtkx-anim-a");
        expect(css).toContain("gtkx-anim-b");
    });

    it("dedups identical rules without reloading", async () => {
        animationStyleSheet.set("gtkx-anim-a", ".gtkx-anim-a { opacity: 0.5; }");
        await drain();

        const loadSpy = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");
        animationStyleSheet.set("gtkx-anim-a", ".gtkx-anim-a { opacity: 0.5; }");
        await drain();

        expect(loadSpy).not.toHaveBeenCalled();
    });

    it("treats an empty rule as removal", async () => {
        animationStyleSheet.set("gtkx-anim-a", ".gtkx-anim-a { opacity: 0.5; }");
        await drain();

        const loadSpy = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");
        animationStyleSheet.set("gtkx-anim-a", "");
        await drain();

        expect(loadSpy).toHaveBeenCalledTimes(1);
        expect(lastLoadedCss(loadSpy)).not.toContain("gtkx-anim-a");
    });

    it("flushes rule removal", async () => {
        seedRules("gtkx-anim-a", "gtkx-anim-b");
        await drain();

        const loadSpy = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");
        animationStyleSheet.remove("gtkx-anim-b");
        await drain();

        expect(loadSpy).toHaveBeenCalledTimes(1);
        const css = lastLoadedCss(loadSpy);
        expect(css).toContain("gtkx-anim-a");
        expect(css).not.toContain("gtkx-anim-b");
    });
});
