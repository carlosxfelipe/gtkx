import type * as Gtk from "@gtkx/gi/gtk";
import { createElementComponent } from "@gtkx/react/internal";
import { MotionContext } from "framer-motion";
import { getFeatureDefinitions, isControllingVariants, isVariantLabel, type MotionNodeOptions } from "motion-dom";
import { type ComponentType, createElement, type JSX, type ReactNode, type Ref, useContext, useMemo } from "react";
import { splitMotionProps } from "./split-motion-props.js";
import type { AnimationProps } from "./types.js";
import { useMotionElement } from "./use-motion-element.js";
import type { WidgetVisualElement } from "./visual-element.js";

/** A component that accepts the props `P` of the wrapped widget plus {@link AnimationProps}. */
export type AnimatedComponent<P> = (props: P & AnimationProps) => ReactNode;

type ElementInstance<P> = P extends { ref?: Ref<infer T | null> | undefined } ? T : never;

type AnimatedIntrinsics = {
    [K in keyof JSX.IntrinsicElements as ElementInstance<JSX.IntrinsicElements[K]> extends Gtk.Widget
        ? K
        : never]: AnimatedComponent<JSX.IntrinsicElements[K]>;
};

type InitialVariant = false | string | string[];
type AnimateVariant = string | string[];

interface MotionContextValue {
    visualElement?: WidgetVisualElement;
    initial?: InitialVariant;
    animate?: AnimateVariant;
}

const asDependency = (prop: InitialVariant | AnimateVariant | undefined): string | boolean | undefined =>
    Array.isArray(prop) ? prop.join(" ") : prop;

const getCurrentTreeVariants = (props: MotionNodeOptions, context: MotionContextValue): MotionContextValue => {
    if (isControllingVariants(props)) {
        const { initial, animate } = props;
        return {
            ...(initial === false || isVariantLabel(initial) ? { initial: initial as InitialVariant } : {}),
            ...(isVariantLabel(animate) ? { animate: animate as AnimateVariant } : {}),
        };
    }
    if (props.inherit === false) return {};
    return {
        ...(context.initial !== undefined ? { initial: context.initial } : {}),
        ...(context.animate !== undefined ? { animate: context.animate } : {}),
    };
};

const useMotionContext = (props: MotionNodeOptions, visualElement: WidgetVisualElement): MotionContextValue => {
    const parentContext = useContext(MotionContext) as MotionContextValue;
    const { initial, animate } = getCurrentTreeVariants(props, parentContext);
    return useMemo(
        () => ({
            visualElement,
            ...(initial !== undefined ? { initial } : {}),
            ...(animate !== undefined ? { animate } : {}),
        }),
        [visualElement, asDependency(initial), asDependency(animate)],
    );
};

type MeasureLayoutComponent = ComponentType<Record<string, unknown>>;

const getMeasureLayout = (props: MotionNodeOptions): MeasureLayoutComponent | undefined => {
    const definitions = getFeatureDefinitions();
    const drag = definitions.drag;
    const layout = definitions.layout;
    const enabled = Boolean(drag?.isEnabled(props)) || Boolean(layout?.isEnabled(props));
    if (!enabled) return undefined;
    return drag?.MeasureLayout ?? layout?.MeasureLayout;
};

const animatedByName = new Map<string, unknown>();
const animatedByComponent = new WeakMap<object, unknown>();

const animatedFactory = <P extends object>(Component: (props: P) => ReactNode): AnimatedComponent<P> => {
    const cached = animatedByComponent.get(Component) as AnimatedComponent<P> | undefined;
    if (cached) return cached;

    const Animated = (props: P & AnimationProps): ReactNode => {
        const externalRef = (props as { ref?: Ref<Gtk.Widget | null> }).ref;
        const { motionProps, widgetProps } = splitMotionProps(props);
        const { element, mergedRef } = useMotionElement(motionProps, externalRef);
        const context = useMotionContext(motionProps, element);
        const MeasureLayout = getMeasureLayout(motionProps);
        return createElement(
            MotionContext.Provider,
            { value: context },
            MeasureLayout && element.projection
                ? createElement(MeasureLayout, { ...motionProps, visualElement: element, key: "measure-layout" })
                : null,
            createElement(Component, { ...widgetProps, ref: mergedRef } as P),
        );
    };

    animatedByComponent.set(Component, Animated);
    return Animated;
};

type Animated = typeof animatedFactory & { create: typeof animatedFactory } & AnimatedIntrinsics;

/**
 * Wraps GTK4 widgets so they accept {@link AnimationProps} and drive their own enter, update, and
 * exit animations through the framer-motion engine. Access an intrinsic element by name
 * (`animated.GtkBox`) to get an animated version of it, or call `animated(Component)` (also
 * `animated.create(Component)`) to wrap a custom widget component. Results are cached per
 * component.
 */
export const animated: Animated = new Proxy(animatedFactory, {
    get(target, key) {
        if (key === "create") return target;
        if (typeof key !== "string" || key in target) return Reflect.get(target, key);
        if (!animatedByName.has(key)) {
            animatedByName.set(key, animatedFactory(createElementComponent<{ ref?: Ref<Gtk.Widget | null> }>(key)));
        }
        return animatedByName.get(key);
    },
}) as Animated;
