import * as Gtk from "@gtkx/gi/gtk";
import { useMergeRefs } from "@gtkx/react/internal";
import { type Ref, type RefCallback, useId, useLayoutEffect, useRef } from "react";
import { useIsInitialPresence, usePresence } from "./animate-presence.js";
import { isTargetEqual, splitTarget } from "./animation-target.js";
import type { AnimationProps, AnimationTargetWithTransition } from "./animation-types.js";
import { isInstantTransition } from "./transition.js";
import { WidgetAnimator } from "./widget-animator.js";

const sanitizeId = (id: string): string => `gtkx-anim-${id.replace(/[^a-zA-Z0-9]/g, "")}`;

const animationsDisabled = (): boolean => Gtk.Settings.getDefault()?.gtkEnableAnimations === false;

const isExitInstant = (props: AnimationProps): boolean => {
    const { values, transition: override } = splitTarget(props.exit ?? {});
    const transition = override ?? props.transition ?? {};
    if (Object.keys(values).length === 0) return true;
    if (transition.followEnableAnimations !== false && animationsDisabled()) return true;
    return isInstantTransition(transition);
};

export const useAnimatedWidget = (
    externalRef: Ref<Gtk.Widget | null> | undefined,
    props: AnimationProps,
): RefCallback<Gtk.Widget> => {
    const widgetRef = useRef<Gtk.Widget | null>(null);
    const mergedRef = useMergeRefs(externalRef, widgetRef);

    const isInitialPresence = useIsInitialPresence();

    const className = sanitizeId(useId());
    const propsRef = useRef(props);
    propsRef.current = props;

    const animateOnMountRef = useRef(isInitialPresence);
    animateOnMountRef.current = isInitialPresence;

    const animatorRef = useRef<WidgetAnimator | null>(null);
    if (!animatorRef.current) {
        animatorRef.current = new WidgetAnimator(className, widgetRef, propsRef);
    }
    const animator = animatorRef.current;

    useLayoutEffect(() => {
        animator.applyMount(animateOnMountRef.current);
        return () => animator.dispose();
    }, [animator]);

    const previousAnimateRef = useRef<AnimationTargetWithTransition | undefined>(props.animate);
    useLayoutEffect(() => {
        const previous = previousAnimateRef.current;
        previousAnimateRef.current = props.animate;

        if (!widgetRef.current || !props.animate) return;
        if (isTargetEqual(previous, props.animate)) return;

        animator.startAnimation(props.animate);
    }, [animator, props.animate]);

    const [isPresent, safeToRemove] = usePresence(() => isExitInstant(propsRef.current));

    const exitStartedRef = useRef(false);
    const wasPresentRef = useRef(isPresent);
    useLayoutEffect(() => {
        const wasPresent = wasPresentRef.current;
        wasPresentRef.current = isPresent;

        if (!isPresent) {
            if (exitStartedRef.current) return;
            exitStartedRef.current = true;
            animator.startAnimation(props.exit ?? {}, () => safeToRemove());
            return;
        }

        if (wasPresent || !exitStartedRef.current) return;
        exitStartedRef.current = false;
        if (props.animate) animator.startAnimation(props.animate);
    }, [isPresent, props.exit, props.animate, animator, safeToRemove]);

    return mergedRef;
};
