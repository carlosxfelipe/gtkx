import { isShallowEqual } from "@gtkx/utils";
import type { AnimationTarget, AnimationTargetWithTransition, Transition } from "./animation-types.js";

export const splitTarget = (
    target: AnimationTargetWithTransition,
): { values: AnimationTarget; transition: Transition | undefined } => {
    const { transition, ...values } = target;
    return { values, transition };
};

export const isTargetEqual = (
    a: AnimationTargetWithTransition | undefined,
    b: AnimationTargetWithTransition | undefined,
): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    return isShallowEqual(splitTarget(a).values, splitTarget(b).values) && isShallowEqual(a.transition, b.transition);
};
