import type { MotionNodeOptions, MotionValue, Transition } from "motion-dom";

/**
 * Style values the GTK CSS bridge can render. Keys use the camelCase motion naming
 * (`backgroundColor`, `borderRadius`, transform keys like `x` or `scale`); values may be
 * static or driven by a {@link MotionValue}.
 */
export type GtkMotionStyle = Record<string, string | number | MotionValue<string> | MotionValue<number>>;

/** A single animatable value: a static value, a keyframe array, or a motion value. */
export type GtkAnimationValue =
    | string
    | number
    | Array<string | number | null>
    | MotionValue<number>
    | MotionValue<string>;

/** An animation target: animatable values keyed by style name. */
export interface GtkTarget {
    [key: string]: GtkAnimationValue | Transition | undefined;
}

/** An animation target with an optional per-target transition override. */
export interface GtkTargetAndTransition extends GtkTarget {
    transition?: Transition;
}

/** Named variants mapping labels to animation targets. */
export type GtkVariants = Record<string, GtkTargetAndTransition>;

type OverriddenMotionProps =
    | "initial"
    | "animate"
    | "exit"
    | "variants"
    | "whileHover"
    | "whileTap"
    | "whileFocus"
    | "whileInView"
    | "whileDrag";

/**
 * Props accepted by every animated component on top of the wrapped widget's own props:
 * framer-motion's animation, gesture, drag, viewport, and layout options plus a GTK `style`
 * record.
 */
export interface AnimationProps extends Omit<MotionNodeOptions, OverriddenMotionProps> {
    initial?: boolean | string | string[] | GtkTarget;
    animate?: string | string[] | GtkTargetAndTransition;
    exit?: string | string[] | GtkTargetAndTransition;
    variants?: GtkVariants;
    whileHover?: string | GtkTargetAndTransition;
    whileTap?: string | GtkTargetAndTransition;
    whileFocus?: string | GtkTargetAndTransition;
    whileInView?: string | GtkTargetAndTransition;
    whileDrag?: string | GtkTargetAndTransition;
    style?: GtkMotionStyle;
}
