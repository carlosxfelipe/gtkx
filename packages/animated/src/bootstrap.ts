import { DisplayManager } from "@gtkx/gi/gdk";
import type * as Gtk from "@gtkx/gi/gtk";
import { ReducedMotion, Settings } from "@gtkx/gi/gtk";
import type { FeaturePackages, HydratedFeatureDefinitions, MotionProps } from "motion/react";
import {
    animations,
    getFeatureDefinitions,
    hasReducedMotionListener,
    MotionGlobalConfig,
    prefersReducedMotion,
    setFeatureDefinitions,
} from "motion/react";
import { DragFeature, PanFeature } from "./drag.js";
import { FocusFeature, HoverFeature, PressFeature } from "./gestures.js";
import { InViewFeature } from "./in-view.js";
import { GtkProjectionNode, MeasureLayout } from "./layout.js";

const featureProps: Record<string, string[]> = {
    animation: ["animate", "variants", "whileHover", "whileTap", "exit", "whileInView", "whileFocus", "whileDrag"],
    exit: ["exit"],
    drag: ["drag", "dragControls"],
    focus: ["whileFocus"],
    hover: ["whileHover", "onHoverStart", "onHoverEnd"],
    tap: ["whileTap", "onTap", "onTapStart", "onTapCancel"],
    pan: ["onPan", "onPanStart", "onPanSessionStart", "onPanEnd"],
    inView: ["whileInView", "onViewportEnter", "onViewportLeave"],
    layout: ["layout", "layoutId"],
};

const featurePackages: FeaturePackages = {
    ...animations,
    hover: { Feature: HoverFeature },
    tap: { Feature: PressFeature },
    focus: { Feature: FocusFeature },
    inView: { Feature: InViewFeature },
    pan: { Feature: PanFeature },
    drag: { Feature: DragFeature, ProjectionNode: GtkProjectionNode, MeasureLayout },
    layout: { ProjectionNode: GtkProjectionNode, MeasureLayout },
} as unknown as FeaturePackages;

const registerFeatures = (): void => {
    const definitions = { ...getFeatureDefinitions() } as Record<string, object>;
    for (const key in featureProps) {
        const names = featureProps[key] ?? [];
        definitions[key] = {
            ...definitions[key],
            isEnabled: (props: MotionProps) => names.some((name) => Boolean(props[name as keyof MotionProps])),
            ...(featurePackages as Record<string, object>)[key],
        };
    }
    setFeatureDefinitions(definitions as unknown as HydratedFeatureDefinitions);
};

const applySettings = (settings: Gtk.Settings): void => {
    MotionGlobalConfig.instantAnimations = !settings.gtkEnableAnimations;
    hasReducedMotionListener.current = true;
    prefersReducedMotion.current = settings.gtkInterfaceReducedMotion === ReducedMotion.REDUCE;
};

const attachSettings = (): boolean => {
    const settings = Settings.getDefault();
    if (!settings) return false;
    applySettings(settings);
    settings.on("notify::gtk-enable-animations", () => applySettings(settings));
    settings.on("notify::gtk-interface-reduced-motion", () => applySettings(settings));
    return true;
};

const syncSettings = (): void => {
    if (attachSettings()) return;
    DisplayManager.get().once("display-opened", () => attachSettings());
};

registerFeatures();
syncSettings();
