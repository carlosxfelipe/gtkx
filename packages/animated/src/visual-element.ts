import "./motion-env.js";
import {
    type AnyResolvedKeyframe,
    createBox,
    defaultTransformValue,
    isMotionValue,
    type MotionNodeOptions,
    type MotionStyle,
    type MotionValue,
    type ResolvedValues,
    removeAxisDelta,
    scrapeHTMLMotionValuesFromProps,
    transformProps,
    VisualElement,
} from "motion-dom";
import { animationStyleSheet } from "./animation-css-provider.js";
import { rootWidgetOf } from "./bridge/geometry.js";
import type { AppliedProjectionDelta, WidgetProxy } from "./bridge/widget-proxy.js";
import { buildGtkStyles, type GtkRenderState, serializeGtkRule } from "./build-gtk-styles.js";

export interface GtkVisualElementOptions {
    className: string;
}

interface StyledProps extends MotionNodeOptions {
    style?: MotionStyle;
}

interface ProjectionStyles {
    applyProjectionStyles(targetStyle: ResolvedValues, styleProp?: MotionStyle): void;
    projectionDelta?: AppliedProjectionDelta;
}

type Box = ReturnType<typeof createBox>;

const styleOf = (props: MotionNodeOptions): MotionStyle | undefined => (props as StyledProps).style;

const isIdentityDelta = (delta: AppliedProjectionDelta): boolean =>
    delta.x.translate === 0 && delta.y.translate === 0 && delta.x.scale === 1 && delta.y.scale === 1;

const recordAppliedProjection = (instance: WidgetProxy, projection?: ProjectionStyles): void => {
    const delta = projection?.projectionDelta;
    if (!delta || isIdentityDelta(delta)) {
        instance.appliedProjectionDelta = null;
        return;
    }
    instance.appliedProjectionDelta = {
        x: { ...delta.x },
        y: { ...delta.y },
    };
};

export class GtkVisualElement extends VisualElement<WidgetProxy, GtkRenderState, GtkVisualElementOptions> {
    type = "gtk";

    sortInstanceNodePosition(): number {
        return 0;
    }

    measureInstanceViewportBox(instance: WidgetProxy): Box {
        const widget = instance.widget;
        const [ok, rect] = widget.computeBounds(rootWidgetOf(widget));
        if (!ok) return createBox();
        const box: Box = {
            x: { min: rect.getX(), max: rect.getX() + rect.getWidth() },
            y: { min: rect.getY(), max: rect.getY() + rect.getHeight() },
        };
        const applied = instance.appliedProjectionDelta;
        if (applied) {
            removeAxisDelta(box.x, applied.x.translate, applied.x.scale, applied.x.origin);
            removeAxisDelta(box.y, applied.y.translate, applied.y.scale, applied.y.origin);
        }
        return box;
    }

    getBaseTargetFromProps(props: MotionNodeOptions, key: string): AnyResolvedKeyframe | MotionValue | undefined {
        return styleOf(props)?.[key];
    }

    readValueFromInstance(instance: WidgetProxy, key: string): AnyResolvedKeyframe | null | undefined {
        if (key === "opacity") return instance.widget.opacity;
        if (transformProps.has(key)) return defaultTransformValue(key);
        return undefined;
    }

    removeValueFromRenderState(key: string, renderState: GtkRenderState): void {
        delete renderState.vars[key];
        delete renderState.style[key];
    }

    build(renderState: GtkRenderState, latestValues: ResolvedValues, props: MotionNodeOptions): void {
        const style = styleOf(props);
        let merged = latestValues;
        if (style) {
            merged = {};
            for (const key in style) {
                const value = style[key];
                if (value !== undefined && !isMotionValue(value)) merged[key] = value;
            }
            Object.assign(merged, latestValues);
        }
        buildGtkStyles(renderState, merged);
    }

    renderInstance(
        instance: WidgetProxy,
        renderState: GtkRenderState,
        styleProp?: MotionStyle,
        projection?: ProjectionStyles,
    ): void {
        projection?.applyProjectionStyles(renderState.style, styleProp);
        recordAppliedProjection(instance, projection);
        animationStyleSheet.set(this.options.className, serializeGtkRule(this.options.className, renderState));
    }

    override scrapeMotionValuesFromProps(
        props: MotionNodeOptions,
        prevProps: MotionNodeOptions,
        visualElement?: VisualElement,
    ): { [key: string]: MotionValue | AnyResolvedKeyframe } {
        return scrapeHTMLMotionValuesFromProps(props, prevProps, visualElement);
    }
}
