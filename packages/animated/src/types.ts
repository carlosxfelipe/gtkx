import type * as Gtk from "@gtkx/gi/gtk";
import type { DragElastic, MotionNodeOptions, MotionValue, Transition, ViewportOptions } from "motion-dom";

/**
 * Style values the GTK4 CSS bridge can render. Keys use the camelCase motion naming
 * (`backgroundColor`, `borderRadius`, transform keys like `x` or `scale`); values may be
 * static or driven by a {@link MotionValue}.
 */
export type AnimatedStyle = Record<string, string | number | MotionValue<string> | MotionValue<number>>;

/** A single animatable value: a static value, a keyframe array, or a motion value. */
export type AnimationValue =
    | string
    | number
    | Array<string | number | null>
    | MotionValue<number>
    | MotionValue<string>;

/** An animation target: animatable values keyed by style name. */
export interface Target {
    [key: string]: AnimationValue | Transition | undefined;
}

/** An animation target with an optional per-target transition override. */
export interface TargetAndTransition extends Target {
    transition?: Transition;
}

/** Named variants mapping labels to animation targets. */
export type Variants = Record<string, TargetAndTransition>;

/** A ref to the widget a drag or viewport option measures against. */
export interface WidgetRef {
    current: Gtk.Widget | null;
}

/** Pixel offsets from the layout position, as accepted by `dragConstraints`. */
export type DragConstraintsBox = Exclude<DragElastic, boolean | number>;

/** Viewport options for `whileInView`, with `root` measured against a widget rather than a DOM element. */
export interface WidgetViewportOptions extends Omit<ViewportOptions, "root"> {
    root?: WidgetRef;
}

type OverriddenMotionProps =
    | "initial"
    | "animate"
    | "exit"
    | "variants"
    | "whileHover"
    | "whileTap"
    | "whileFocus"
    | "whileInView"
    | "whileDrag"
    | "dragConstraints"
    | "viewport";

/**
 * Props accepted by every animated component on top of the wrapped widget's own props:
 * framer-motion's animation, gesture, drag, viewport, and layout options plus a GTK4 `style`
 * record.
 */
export interface AnimationProps extends Omit<MotionNodeOptions, OverriddenMotionProps> {
    initial?: boolean | string | string[] | Target;
    animate?: string | string[] | TargetAndTransition;
    exit?: string | string[] | TargetAndTransition;
    variants?: Variants;
    whileHover?: string | TargetAndTransition;
    whileTap?: string | TargetAndTransition;
    whileFocus?: string | TargetAndTransition;
    whileInView?: string | TargetAndTransition;
    whileDrag?: string | TargetAndTransition;
    dragConstraints?: false | DragConstraintsBox | WidgetRef;
    viewport?: WidgetViewportOptions;
    style?: AnimatedStyle;
}
