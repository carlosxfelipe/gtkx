import { isValidMotionProp } from "framer-motion";

const WIDGET_PROP_OVERRIDES = new Set(["layoutManager"]);

export interface SplitProps {
    motionProps: Record<string, unknown>;
    widgetProps: Record<string, unknown>;
}

export const splitMotionProps = (props: object): SplitProps => {
    const motionProps: Record<string, unknown> = {};
    const widgetProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
        if (key === "ref") continue;
        if (!WIDGET_PROP_OVERRIDES.has(key) && (key === "style" || isValidMotionProp(key))) {
            motionProps[key] = value;
        } else {
            widgetProps[key] = value;
        }
    }
    return { motionProps, widgetProps };
};
