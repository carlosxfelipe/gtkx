import "./motion-env.js";
import * as Gtk from "@gtkx/gi/gtk";
import { useMergeRefs } from "@gtkx/react/internal";
import { MotionConfigContext, MotionContext, makeUseVisualState, PresenceContext } from "framer-motion";
import {
    getFeatureDefinitions,
    type IProjectionNode,
    type MotionNodeOptions,
    scrapeHTMLMotionValuesFromProps,
    type VisualElementOptions,
} from "motion-dom";
import {
    type Ref,
    type RefCallback,
    useCallback,
    useContext,
    useEffect,
    useId,
    useInsertionEffect,
    useLayoutEffect,
    useRef,
} from "react";
import { animationStyleSheet } from "./animation-css-provider.js";
import { proxyFor, WidgetProxy } from "./bridge/widget-proxy.js";
import { createRenderState, type RenderState } from "./build-styles.js";
import { ensureSettingsBridge } from "./settings-bridge.js";
import { WidgetVisualElement } from "./visual-element.js";

const useVisualState = makeUseVisualState<WidgetProxy, RenderState>({
    scrapeMotionValuesFromProps: scrapeHTMLMotionValuesFromProps,
    createRenderState: createRenderState,
});

const sanitizeId = (id: string): string => id.replace(/[^a-zA-Z0-9]/g, "");

const isRefObject = (value: unknown): value is { current: unknown } =>
    typeof value === "object" && value !== null && "current" in value;

const constraintWrappers = new WeakMap<object, { current: WidgetProxy | null }>();

const normalizeDragConstraints = (props: MotionNodeOptions): MotionNodeOptions => {
    const constraints = props.dragConstraints;
    if (!constraints || !isRefObject(constraints)) return props;
    let wrapper = constraintWrappers.get(constraints);
    if (!wrapper) {
        wrapper = {
            get current(): WidgetProxy | null {
                const value = constraints.current;
                if (value instanceof WidgetProxy) return value;
                if (value instanceof Gtk.Widget) return proxyFor(value);
                return null;
            },
        };
        constraintWrappers.set(constraints, wrapper);
    }
    const next: Record<string, unknown> = { ...props, dragConstraints: wrapper };
    return next;
};

const needsProjection = (props: MotionNodeOptions): boolean =>
    Boolean(props.layout || props.layoutId !== undefined || props.drag);

const getClosestProjectingNode = (element: WidgetVisualElement | undefined): IProjectionNode | undefined => {
    if (!element) return undefined;
    if (element.projection) return element.projection;
    const parent = element.parent instanceof WidgetVisualElement ? element.parent : undefined;
    return getClosestProjectingNode(parent);
};

const ensureProjection = (element: WidgetVisualElement, props: MotionNodeOptions): void => {
    if (element.projection || !needsProjection(props)) return;
    const definitions = getFeatureDefinitions();
    const ProjectionNodeConstructor = definitions.drag?.ProjectionNode ?? definitions.layout?.ProjectionNode;
    if (!ProjectionNodeConstructor) return;
    const parent = element.parent instanceof WidgetVisualElement ? element.parent : undefined;
    element.projection = new ProjectionNodeConstructor(element.latestValues, getClosestProjectingNode(parent));
    const { layoutId, layout, drag, dragConstraints, layoutScroll, layoutRoot, layoutCrossfade } = props;
    element.projection.setOptions({
        layoutId,
        layout,
        alwaysMeasureLayout: Boolean(drag) || Boolean(dragConstraints && isRefObject(dragConstraints)),
        visualElement: element,
        animationType: typeof layout === "string" ? layout : "both",
        crossfade: layoutCrossfade,
        layoutScroll,
        layoutRoot,
    });
    if (element.current) element.projection.mount(element.current);
};

export interface MotionElement {
    element: WidgetVisualElement;
    mergedRef: RefCallback<Gtk.Widget>;
}

export const useMotionElement = (
    rawProps: MotionNodeOptions,
    externalRef: Ref<Gtk.Widget | null> | undefined,
): MotionElement => {
    const props = normalizeDragConstraints(rawProps);
    const visualState = useVisualState(props, false);
    const { visualElement: parent } = useContext(MotionContext);
    const presenceContext = useContext(PresenceContext);
    const motionConfig = useContext(MotionConfigContext);
    const className = `gtkx-anim-${sanitizeId(useId())}`;

    const elementRef = useRef<WidgetVisualElement | null>(null);
    if (elementRef.current === null) {
        ensureSettingsBridge();
        const options: VisualElementOptions<WidgetProxy, RenderState> = {
            visualState,
            props,
            presenceContext,
            blockInitialAnimation: presenceContext ? presenceContext.initial === false : false,
            ...(parent ? { parent } : {}),
            ...(motionConfig.reducedMotion !== undefined ? { reducedMotionConfig: motionConfig.reducedMotion } : {}),
            ...(motionConfig.skipAnimations !== undefined ? { skipAnimations: motionConfig.skipAnimations } : {}),
        };
        elementRef.current = new WidgetVisualElement(options, { className });
    }
    const element = elementRef.current;
    ensureProjection(element, props);

    const isMounted = useRef(false);
    useInsertionEffect(() => {
        if (isMounted.current) element.update(props, presenceContext);
    });

    useLayoutEffect(() => {
        isMounted.current = true;
        element.updateFeatures();
        element.scheduleRenderMicrotask();
    });

    useEffect(() => {
        element.animationState?.animateChanges();
        delete element.enteringChildren;
    });

    const attachRef = useCallback(
        (widget: Gtk.Widget | null): (() => void) | undefined => {
            if (!widget) return undefined;
            widget.addCssClass(className);
            element.mount(proxyFor(widget));
            return () => {
                element.unmount();
                widget.removeCssClass(className);
                animationStyleSheet.remove(className);
            };
        },
        [element, className],
    );

    const mergedRef = useMergeRefs(externalRef, attachRef);

    return { element, mergedRef };
};
