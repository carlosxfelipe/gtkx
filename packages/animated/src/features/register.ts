import "../motion-env.js";
import { domMax } from "framer-motion";
import { type MotionNodeOptions, setFeatureDefinitions } from "motion-dom";
import { WidgetProjectionNode } from "../projection/node.js";
import { FocusFeature } from "./focus.js";
import { InViewFeature } from "./in-view.js";

const hasAny =
    (...keys: (keyof MotionNodeOptions)[]): ((props: MotionNodeOptions) => boolean) =>
    (props) =>
        keys.some((key) => Boolean(props[key]));

const bundled = <T>(feature: T | undefined, slot: string): T => {
    if (feature === undefined) throw new Error(`framer-motion's domMax bundle is missing the ${slot} feature`);
    return feature;
};

export const registerFeatures = (): void => {
    setFeatureDefinitions({
        animation: {
            isEnabled: hasAny(
                "animate",
                "variants",
                "whileHover",
                "whileTap",
                "exit",
                "whileInView",
                "whileFocus",
                "whileDrag",
            ),
            Feature: bundled(domMax.animation?.Feature, "animation"),
        },
        exit: { isEnabled: hasAny("exit"), Feature: bundled(domMax.exit?.Feature, "exit") },
        hover: {
            isEnabled: hasAny("whileHover", "onHoverStart", "onHoverEnd"),
            Feature: bundled(domMax.hover?.Feature, "hover"),
        },
        tap: {
            isEnabled: hasAny("whileTap", "onTap", "onTapStart", "onTapCancel"),
            Feature: bundled(domMax.tap?.Feature, "tap"),
        },
        focus: { isEnabled: hasAny("whileFocus"), Feature: FocusFeature },
        inView: {
            isEnabled: hasAny("whileInView", "onViewportEnter", "onViewportLeave"),
            Feature: InViewFeature,
        },
        pan: {
            isEnabled: hasAny("onPan", "onPanStart", "onPanSessionStart", "onPanEnd"),
            Feature: bundled(domMax.pan?.Feature, "pan"),
        },
        drag: {
            isEnabled: hasAny("drag", "dragControls"),
            Feature: bundled(domMax.drag?.Feature, "drag"),
            ProjectionNode: WidgetProjectionNode,
            MeasureLayout: bundled(domMax.drag?.MeasureLayout, "drag MeasureLayout"),
        },
        layout: {
            isEnabled: hasAny("layout", "layoutId"),
            ProjectionNode: WidgetProjectionNode,
            MeasureLayout: bundled(domMax.layout?.MeasureLayout, "layout MeasureLayout"),
        },
    });
};

registerFeatures();
