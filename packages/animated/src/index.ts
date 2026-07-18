import "./motion-env.js";
import "./features/register.js";

export {
    LayoutGroup,
    MotionConfig,
    useAnimationFrame,
    useIsPresent,
    useMotionValue,
    useMotionValueEvent,
    usePresence,
    usePresenceData,
    useSpring,
    useTime,
    useTransform,
    useVelocity,
} from "framer-motion";
export { type MotionValue, motionValue, type Transition, type VariantLabels } from "motion-dom";
export { AnimatePresence, type AnimatePresenceMode, type AnimatePresenceProps } from "./animate-presence.js";
export { type AnimatedComponent, animated } from "./animated.js";
export { pointerEventFromController } from "./bridge/pointer-event.js";
export { type DragControlOptions, type DragControls, useDragControls } from "./drag-controls.js";
export type { SyntheticEvent } from "./motion-env.js";
export type {
    AnimatedStyle,
    AnimationProps,
    AnimationValue,
    DragConstraintsBox,
    Target,
    TargetAndTransition,
    Variants,
    WidgetRef,
    WidgetViewportOptions,
} from "./types.js";
