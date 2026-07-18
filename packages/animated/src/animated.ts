import type * as Gtk from "@gtkx/gi/gtk";
import { createElementComponent } from "@gtkx/react/internal";
import type { BoundingBox, MotionProps } from "motion/react";
import { warnOnce } from "motion/react";
import type { ComponentPropsWithRef, ComponentType, ElementType, JSX, ReactNode } from "react";
import type { AnimatedComponentOptions } from "./animated-component.js";
import { createAnimatedComponent } from "./animated-component.js";

type WidgetRef = { current: Gtk.Widget | null };

export type AnimatedViewportOptions = Omit<NonNullable<MotionProps["viewport"]>, "root"> & {
    root?: WidgetRef | undefined;
};

type PropOverrides = {
    viewport?: AnimatedViewportOptions | undefined;
    dragConstraints?: false | Partial<BoundingBox> | WidgetRef | undefined;
};

export type AnimatedProps<P> = Omit<P, keyof MotionProps> & Omit<MotionProps, keyof PropOverrides> & PropOverrides;

export type AnimatedComponent<C extends ElementType> = (props: AnimatedProps<ComponentPropsWithRef<C>>) => ReactNode;

type WidgetElementKey = {
    [K in keyof JSX.IntrinsicElements]: JSX.IntrinsicElements[K] extends { cssClasses?: unknown } ? K : never;
}[keyof JSX.IntrinsicElements];

export type AnimatedComponents = {
    [K in WidgetElementKey]: (props: AnimatedProps<JSX.IntrinsicElements[K]>) => ReactNode;
};

type AnimatedFactory = <C extends ElementType>(
    Component: C,
    options?: AnimatedComponentOptions,
) => AnimatedComponent<C>;

export type Animated = AnimatedFactory & AnimatedComponents & { create: AnimatedFactory };

const componentCache = new Map<string, unknown>();

const factory = (Component: ElementType, options?: AnimatedComponentOptions): unknown =>
    createAnimatedComponent(Component as ComponentType<object>, options);

const deprecatedFactory = (Component: ElementType, options?: AnimatedComponentOptions): unknown => {
    if (process.env.NODE_ENV !== "production") {
        warnOnce(false, "animated() is deprecated. Use animated.create() instead.", "animated-deprecated");
    }
    return factory(Component, options);
};

export const animated: Animated = new Proxy(deprecatedFactory, {
    get: (target, key) => {
        if (key === "create") return factory;
        if (typeof key !== "string") return Reflect.get(target, key);
        if (!componentCache.has(key)) {
            componentCache.set(key, createAnimatedComponent(createElementComponent(key)));
        }
        return componentCache.get(key);
    },
}) as unknown as Animated;
