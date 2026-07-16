import * as Gtk from "@gtkx/gi/gtk";
import { MotionGlobalConfig } from "framer-motion";
import { animateMotionValue, motionValue } from "motion-dom";
import { afterEach, describe, expect, it } from "vitest";
import { motionWindow } from "../src/motion-env.js";
import { ensureSettingsBridge } from "../src/settings-bridge.js";

const getSettings = (): Gtk.Settings => {
    const settings = Gtk.Settings.getDefault();
    if (!settings) throw new Error("no default Gtk.Settings");
    return settings;
};

const nextFrames = (count: number): Promise<void> =>
    new Promise((resolve) => {
        let remaining = count;
        const tick = (): void => {
            remaining -= 1;
            if (remaining <= 0) resolve();
            else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });

describe("settings bridge", () => {
    afterEach(() => {
        const settings = getSettings();
        settings.gtkEnableAnimations = true;
        settings.gtkInterfaceReducedMotion = Gtk.ReducedMotion.NO_PREFERENCE;
    });

    it("maps gtk-enable-animations onto MotionGlobalConfig.instantAnimations, live", () => {
        const settings = getSettings();
        settings.gtkEnableAnimations = true;
        ensureSettingsBridge();
        expect(MotionGlobalConfig.instantAnimations).toBe(false);
        settings.gtkEnableAnimations = false;
        expect(MotionGlobalConfig.instantAnimations).toBe(true);
        settings.gtkEnableAnimations = true;
        expect(MotionGlobalConfig.instantAnimations).toBe(false);
    });

    it("maps gtk-interface-reduced-motion onto the matchMedia bridge, live", () => {
        const settings = getSettings();
        ensureSettingsBridge();
        const query = motionWindow.matchMedia("(prefers-reduced-motion)");
        settings.gtkInterfaceReducedMotion = Gtk.ReducedMotion.REDUCE;
        expect(query.matches).toBe(true);
        settings.gtkInterfaceReducedMotion = Gtk.ReducedMotion.NO_PREFERENCE;
        expect(query.matches).toBe(false);
    });

    it("resolves value animations to the final keyframe immediately when animations are disabled", async () => {
        const settings = getSettings();
        ensureSettingsBridge();
        settings.gtkEnableAnimations = false;
        const value = motionValue(0);
        value.start(animateMotionValue("x", value, 100, { duration: 10 }));
        await nextFrames(3);
        expect(value.get()).toBe(100);
    });
});
