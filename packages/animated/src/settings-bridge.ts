import "./motion-env.js";
import * as Gtk from "@gtkx/gi/gtk";
import { MotionGlobalConfig } from "framer-motion";
import { onMatchMediaInit, setReducedMotionMatches } from "./motion-env.js";

let bridged = false;

const applyEnableAnimations = (settings: Gtk.Settings): void => {
    MotionGlobalConfig.instantAnimations = settings.gtkEnableAnimations === false;
};

const applyReducedMotion = (settings: Gtk.Settings): void => {
    try {
        setReducedMotionMatches(settings.gtkInterfaceReducedMotion === Gtk.ReducedMotion.REDUCE);
    } catch {
        setReducedMotionMatches(false);
    }
};

export const ensureSettingsBridge = (): void => {
    if (bridged) return;
    const settings = Gtk.Settings.getDefault();
    if (!settings) return;
    bridged = true;
    applyEnableAnimations(settings);
    settings.on("notify::gtk-enable-animations", () => applyEnableAnimations(settings));
    applyReducedMotion(settings);
    try {
        settings.on("notify::gtk-interface-reduced-motion", () => applyReducedMotion(settings));
    } catch {
        setReducedMotionMatches(false);
    }
};

onMatchMediaInit(ensureSettingsBridge);
