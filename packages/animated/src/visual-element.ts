import type * as Gtk from "@gtkx/gi/gtk";
import type {
    AnyResolvedKeyframe,
    Box,
    CreateVisualElement,
    MotionProps,
    MotionValue,
    ResolvedValues,
} from "motion/react";
import {
    buildHTMLStyles,
    convertBoundingBoxToBox,
    createBox,
    defaultTransformValue,
    isMotionValue,
    scrapeHTMLMotionValuesFromProps,
    transformBox,
    transformProps,
    VisualElement,
} from "motion/react";
import type { MotionStyle } from "motion-dom";
import { buildDeclarations, styleRegistry } from "./style-registry.js";

type ProjectionStyler = {
    applyProjectionStyles(targetStyle: Record<string, string | number>, styleProp?: MotionStyle): void;
};

export type GtkRenderState = {
    style: ResolvedValues;
    transform: ResolvedValues;
    transformOrigin: { originX?: string; originY?: string; originZ?: string };
    vars: Record<string, string | number>;
};

export const createRenderState = (): GtkRenderState => ({
    style: {},
    transform: {},
    transformOrigin: {},
    vars: {},
});

export const measureWidgetBounds = (widget: Gtk.Widget): Box => {
    const root = widget.getRoot();
    if (!root) return createBox();
    const [contained, rect] = widget.computeBounds(root as unknown as Gtk.Widget);
    if (!contained) return createBox();
    const x = rect.getX();
    const y = rect.getY();
    return convertBoundingBoxToBox({ left: x, top: y, right: x + rect.getWidth(), bottom: y + rect.getHeight() });
};

const widgetPath = (widget: Gtk.Widget): Gtk.Widget[] => {
    const path: Gtk.Widget[] = [];
    let current: Gtk.Widget | null = widget;
    while (current) {
        path.unshift(current);
        current = current.getParent();
    }
    return path;
};

export const compareWidgetOrder = (a: Gtk.Widget, b: Gtk.Widget): number => {
    if (a === b) return 0;
    const pathA = widgetPath(a);
    const pathB = widgetPath(b);
    const length = Math.min(pathA.length, pathB.length);
    for (let depth = 0; depth < length; depth += 1) {
        if (pathA[depth] === pathB[depth]) continue;
        if (depth === 0) return 0;
        let sibling = pathA[depth]?.getNextSibling() ?? null;
        while (sibling) {
            if (sibling === pathB[depth]) return -1;
            sibling = sibling.getNextSibling();
        }
        return 1;
    }
    return pathA.length < pathB.length ? -1 : 1;
};

const applyCanTarget = (instance: Gtk.Widget, output: Record<string, string | number>): void => {
    const pointerEvents = output.pointerEvents;
    delete output.pointerEvents;
    if (pointerEvents !== undefined) {
        instance.setCanTarget(pointerEvents !== "none");
    }
};

export class GtkVisualElement extends VisualElement<Gtk.Widget, GtkRenderState, Record<string, never>> {
    type = "gtk";
    styleClass: string | null = null;
    private childSubscription: (() => void) | undefined;

    readValueFromInstance(instance: Gtk.Widget, key: string): AnyResolvedKeyframe | null | undefined {
        if (transformProps.has(key)) return defaultTransformValue(key);
        if (key === "opacity") return instance.getOpacity();
        return undefined;
    }

    getBaseTargetFromProps(props: MotionProps, key: string): AnyResolvedKeyframe | MotionValue | undefined {
        const style = props.style as Record<string, AnyResolvedKeyframe | MotionValue> | undefined;
        return style ? style[key] : undefined;
    }

    sortInstanceNodePosition(a: Gtk.Widget, b: Gtk.Widget): number {
        return compareWidgetOrder(a, b);
    }

    measureInstanceViewportBox(instance: Gtk.Widget): Box {
        const box = measureWidgetBounds(instance);
        transformBox(box, this.latestValues);
        return box;
    }

    removeValueFromRenderState(key: string, renderState: GtkRenderState): void {
        delete renderState.style[key];
        delete renderState.vars[key];
    }

    override scrapeMotionValuesFromProps(
        props: MotionProps,
        prevProps: MotionProps,
        visualElement?: VisualElement,
    ): { [key: string]: MotionValue | AnyResolvedKeyframe } {
        return scrapeHTMLMotionValuesFromProps(props, prevProps, visualElement);
    }

    build(renderState: GtkRenderState, latestValues: ResolvedValues, props: MotionProps): void {
        buildHTMLStyles(renderState, latestValues, props.transformTemplate);
    }

    renderInstance(
        instance: Gtk.Widget,
        renderState: GtkRenderState,
        styleProp?: MotionStyle,
        projection?: ProjectionStyler,
    ): void {
        const output: Record<string, string | number> = {};
        if (styleProp) {
            for (const key in styleProp) {
                if (transformProps.has(key)) continue;
                const value = (styleProp as Record<string, unknown>)[key];
                if (value === undefined || value === null || isMotionValue(value)) continue;
                output[key] = value as string | number;
            }
        }
        Object.assign(output, renderState.vars, renderState.style);
        projection?.applyProjectionStyles(output, styleProp);
        applyCanTarget(instance, output);
        let className = this.styleClass;
        if (className === null) {
            className = styleRegistry.allocateClass();
            this.styleClass = className;
            instance.addCssClass(className);
        }
        styleRegistry.setRule(className, buildDeclarations(output));
    }

    override handleChildMotionValue(): void {
        if (this.childSubscription) {
            this.childSubscription();
            this.childSubscription = undefined;
        }
        const { children } = this.props as { children?: unknown };
        if (isMotionValue(children)) {
            this.childSubscription = children.on("change", (latest) => {
                const instance = this.current;
                if (instance && "label" in instance) Reflect.set(instance, "label", String(latest));
            });
        }
    }

    override unmount(): void {
        if (this.styleClass !== null) {
            styleRegistry.removeRule(this.styleClass);
            this.current?.removeCssClass(this.styleClass);
            this.styleClass = null;
        }
        super.unmount();
    }
}

export const createGtkVisualElement: CreateVisualElement = (_Component, options) =>
    new GtkVisualElement(
        options as unknown as ConstructorParameters<typeof GtkVisualElement>[0],
        {},
    ) as unknown as ReturnType<CreateVisualElement>;
