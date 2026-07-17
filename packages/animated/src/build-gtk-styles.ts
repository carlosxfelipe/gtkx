import "./motion-env.js";
import { createLogger } from "@gtkx/utils";
import {
    buildHTMLStyles,
    camelToDash,
    getValueAsType,
    type HTMLRenderState,
    px,
    type ResolvedValues,
    type ValueType,
} from "motion-dom";

export type GtkRenderState = HTMLRenderState;

const log = createLogger("animated");

const warnedKeys = new Set<string>();

const warnUnsupported = (key: string): void => {
    if (process.env.NODE_ENV === "production" || warnedKeys.has(key)) return;
    warnedKeys.add(key);
    log.warn(`"${key}" is not expressible in GTK4 CSS and was dropped from the animated style output`);
};

const SUPPORTED_STYLE_KEYS = new Set([
    "opacity",
    "color",
    "backgroundColor",
    "borderColor",
    "caretColor",
    "outlineColor",
    "borderRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
    "borderWidth",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "minWidth",
    "minHeight",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontSize",
    "letterSpacing",
    "filter",
    "boxShadow",
    "transform",
    "transformOrigin",
]);

export const createGtkRenderState = (): GtkRenderState => ({
    style: {},
    transform: {},
    transformOrigin: {},
    vars: {},
});

export const buildGtkStyles = (state: GtkRenderState, latestValues: ResolvedValues): void => {
    buildHTMLStyles(state, latestValues);
};

const stripOriginDepth = (value: string): string => value.split(" ").slice(0, 2).join(" ");

const EXTRA_VALUE_TYPES: Record<string, ValueType> = {
    minWidth: px,
    minHeight: px,
    letterSpacing: px,
};

export const serializeGtkStyle = (style: ResolvedValues): string => {
    const declarations: string[] = [];
    const hidden = style.visibility === "hidden";
    for (const key in style) {
        if (key === "visibility" || key === "pointerEvents") continue;
        if (hidden && key === "opacity") continue;
        const value = style[key];
        if (value === undefined || value === null || value === "") continue;
        if (!SUPPORTED_STYLE_KEYS.has(key)) {
            warnUnsupported(key);
            continue;
        }
        if (key === "transformOrigin") {
            declarations.push(`transform-origin: ${stripOriginDepth(String(value))};`);
            continue;
        }
        const resolved = getValueAsType(value, EXTRA_VALUE_TYPES[key]);
        declarations.push(`${camelToDash(key)}: ${String(resolved)};`);
    }
    if (hidden) declarations.push("opacity: 0;");
    return declarations.join(" ");
};

export const serializeGtkRule = (className: string, state: GtkRenderState): string => {
    for (const key in state.vars) {
        warnUnsupported(key);
    }
    const body = serializeGtkStyle(state.style);
    if (body.length === 0) return "";
    return `.${className} { ${body} }`;
};
