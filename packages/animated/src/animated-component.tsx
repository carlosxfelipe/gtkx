import "./bootstrap.js";

import type * as Gtk from "@gtkx/gi/gtk";
import type { CreateVisualElement, IProjectionNode, MotionProps, VisualElement, VisualState } from "motion/react";
import {
    filterProps,
    getFeatureDefinitions,
    isControllingVariants,
    isMotionValue,
    isVariantLabel,
    LayoutGroupContext,
    MotionConfigContext,
    MotionContext,
    makeUseVisualState,
    PresenceContext,
    SwitchLayoutGroupContext,
    scrapeHTMLMotionValuesFromProps,
} from "motion/react";
import type { ComponentType, ContextType, ReactNode, Ref } from "react";
import {
    createElement,
    useCallback,
    useContext,
    useEffect,
    useInsertionEffect,
    useLayoutEffect,
    useMemo,
    useRef,
} from "react";
import { createGtkVisualElement, createRenderState } from "./visual-element.js";

type MotionContextProps = ContextType<typeof MotionContext>;
type GtkMotionProps = MotionProps & Partial<ContextType<typeof MotionConfigContext>>;
type ProjectionNodeConstructor = new (
    latestValues: Record<string, string | number>,
    parent?: IProjectionNode,
) => IProjectionNode;

export type AnimatedComponentOptions = {
    forwardMotionProps?: boolean;
};

const getCurrentTreeVariants = (props: MotionProps, context: MotionContextProps): MotionContextProps => {
    if (isControllingVariants(props)) {
        const { initial, animate } = props;
        return {
            initial: initial === false || isVariantLabel(initial) ? initial : undefined,
            animate: isVariantLabel(animate) ? animate : undefined,
        } as MotionContextProps;
    }
    return props.inherit !== false ? context : {};
};

const variantLabelsAsDependency = (prop: MotionContextProps["initial"]): string | boolean | undefined =>
    Array.isArray(prop) ? prop.join(" ") : (prop as string | boolean | undefined);

const useCreateAnimatedContext = (props: MotionProps): MotionContextProps => {
    const { initial, animate } = getCurrentTreeVariants(props, useContext(MotionContext));
    return useMemo(
        () => ({ initial, animate }),
        [variantLabelsAsDependency(initial), variantLabelsAsDependency(animate)],
    );
};

const getClosestProjectingNode = (visualElement: VisualElement | undefined): IProjectionNode | undefined => {
    if (!visualElement) return undefined;
    return (visualElement.options as { allowProjection?: boolean }).allowProjection !== false
        ? visualElement.projection
        : getClosestProjectingNode(visualElement.parent);
};

const attachProjectionNode = (
    visualElement: VisualElement<Gtk.Widget>,
    props: GtkMotionProps,
    ProjectionNode: ProjectionNodeConstructor,
    initialPromotionConfig: ContextType<typeof SwitchLayoutGroupContext>,
): void => {
    const { layoutId, layout, drag, dragConstraints, layoutScroll, layoutRoot, layoutAnchor, layoutCrossfade } = props;
    visualElement.projection = new ProjectionNode(
        visualElement.latestValues,
        getClosestProjectingNode(visualElement.parent),
    );
    visualElement.projection.setOptions({
        layoutId,
        layout,
        alwaysMeasureLayout: Boolean(drag) || Boolean(dragConstraints && "current" in dragConstraints),
        visualElement: visualElement as unknown as VisualElement,
        animationType: typeof layout === "string" ? layout : "both",
        initialPromotionConfig,
        crossfade: layoutCrossfade,
        layoutScroll,
        layoutRoot,
        layoutAnchor,
    });
};

type UseGtkVisualElementOptions = {
    Component: string | ComponentType;
    visualState: VisualState<Gtk.Widget, ReturnType<typeof createRenderState>>;
    props: GtkMotionProps;
    createVisualElement: CreateVisualElement;
    ProjectionNode?: ProjectionNodeConstructor | undefined;
};

const useGtkVisualElement = ({
    Component,
    visualState,
    props,
    createVisualElement,
    ProjectionNode,
}: UseGtkVisualElementOptions): VisualElement<Gtk.Widget> | undefined => {
    const { visualElement: parent } = useContext(MotionContext);
    const presenceContext = useContext(PresenceContext);
    const motionConfig = useContext(MotionConfigContext);
    const visualElementRef = useRef<VisualElement<Gtk.Widget> | null>(null);
    if (!visualElementRef.current) {
        visualElementRef.current = createVisualElement(
            Component as string,
            {
                visualState: visualState as unknown as Parameters<CreateVisualElement>[1]["visualState"],
                parent,
                props,
                presenceContext,
                blockInitialAnimation: presenceContext ? presenceContext.initial === false : false,
                reducedMotionConfig: motionConfig.reducedMotion,
                skipAnimations: motionConfig.skipAnimations,
            } as Parameters<CreateVisualElement>[1],
        ) as unknown as VisualElement<Gtk.Widget>;
    }
    const visualElement = visualElementRef.current;
    const initialLayoutGroupConfig = useContext(SwitchLayoutGroupContext);
    if (visualElement && !visualElement.projection && ProjectionNode && visualElement.type === "gtk") {
        attachProjectionNode(visualElement, props, ProjectionNode, initialLayoutGroupConfig);
    }
    const isMounted = useRef(false);
    useInsertionEffect(() => {
        if (visualElement && isMounted.current) {
            visualElement.update(props, presenceContext);
        }
    });
    useLayoutEffect(() => {
        if (!visualElement) return;
        isMounted.current = true;
        visualElement.updateFeatures();
        visualElement.scheduleRenderMicrotask();
    });
    useEffect(() => {
        if (!visualElement) return;
        visualElement.animationState?.animateChanges();
        visualElement.enteringChildren = undefined;
    });
    return visualElement;
};

const useAnimatedRef = (
    visualState: VisualState<Gtk.Widget, ReturnType<typeof createRenderState>>,
    visualElement: VisualElement<Gtk.Widget> | undefined,
    externalRef: Ref<Gtk.Widget> | undefined,
): ((instance: Gtk.Widget | null) => void) => {
    const externalRefContainer = useRef(externalRef);
    useInsertionEffect(() => {
        externalRefContainer.current = externalRef;
    });
    const refCleanup = useRef<VoidFunction | null>(null);
    const applyExternalRef = (instance: Gtk.Widget | null): void => {
        const ref = externalRefContainer.current;
        if (typeof ref !== "function") {
            if (ref) ref.current = instance;
            return;
        }
        if (instance) {
            const cleanup = ref(instance);
            if (typeof cleanup === "function") refCleanup.current = cleanup;
            return;
        }
        if (refCleanup.current) {
            refCleanup.current();
            refCleanup.current = null;
            return;
        }
        ref(instance);
    };
    const applyExternalRefContainer = useRef(applyExternalRef);
    applyExternalRefContainer.current = applyExternalRef;
    return useCallback(
        (instance: Gtk.Widget | null) => {
            if (instance) visualState.onMount?.(instance);
            if (visualElement) {
                if (instance) {
                    visualElement.mount(instance);
                } else {
                    visualElement.unmount();
                }
            }
            applyExternalRefContainer.current(instance);
        },
        [visualElement],
    );
};

const getProjectionFunctionality = (
    props: GtkMotionProps,
): {
    MeasureLayout?: ComponentType<MotionProps & { visualElement: VisualElement<Gtk.Widget> }>;
    ProjectionNode?: ProjectionNodeConstructor;
} => {
    const { drag, layout } = getFeatureDefinitions();
    if (!drag && !layout) return {};
    const combined = { ...drag, ...layout };
    const enabled = Boolean(drag?.isEnabled(props) || layout?.isEnabled(props));
    return {
        MeasureLayout: enabled
            ? (combined.MeasureLayout as unknown as ComponentType<
                  MotionProps & { visualElement: VisualElement<Gtk.Widget> }
              >)
            : undefined,
        ProjectionNode: combined.ProjectionNode as unknown as ProjectionNodeConstructor,
    };
};

const useLayoutId = ({ layoutId }: MotionProps): string | undefined => {
    const layoutGroupId = useContext(LayoutGroupContext).id;
    return layoutGroupId && layoutId !== undefined ? `${layoutGroupId}-${layoutId}` : layoutId;
};

const useVisualState = makeUseVisualState<Gtk.Widget, ReturnType<typeof createRenderState>>({
    scrapeMotionValuesFromProps: scrapeHTMLMotionValuesFromProps,
    createRenderState,
});

const useRenderedElement = (
    Component: string | ComponentType,
    props: MotionProps,
    ref: (instance: Gtk.Widget | null) => void,
    forwardMotionProps: boolean,
): ReactNode => {
    const filteredProps = filterProps(props, false, forwardMotionProps);
    const { children } = props;
    const renderedChildren = useMemo(() => (isMotionValue(children) ? children.get() : children), [children]);
    return createElement(Component as ComponentType<Record<string, unknown>>, {
        ...filteredProps,
        ref,
        children: renderedChildren,
    });
};

export const createAnimatedComponent = <Props extends object>(
    Component: string | ComponentType<Props>,
    { forwardMotionProps = false }: AnimatedComponentOptions = {},
): ComponentType<Props & MotionProps & { ref?: Ref<Gtk.Widget> }> => {
    const AnimatedComponent = (allProps: Props & MotionProps & { ref?: Ref<Gtk.Widget> }): ReactNode => {
        const { ref: externalRef, ...rest } = allProps;
        const props = rest as unknown as MotionProps;
        const configAndProps: GtkMotionProps = {
            ...useContext(MotionConfigContext),
            ...props,
            layoutId: useLayoutId(props),
        };
        const { isStatic } = configAndProps;
        const context: MotionContextProps = useCreateAnimatedContext(props);
        const visualState = useVisualState(props, Boolean(isStatic));
        let MeasureLayoutComponent:
            | ComponentType<MotionProps & { visualElement: VisualElement<Gtk.Widget> }>
            | undefined;
        if (!isStatic) {
            const projectionFunctionality = getProjectionFunctionality(configAndProps);
            MeasureLayoutComponent = projectionFunctionality.MeasureLayout;
            context.visualElement = useGtkVisualElement({
                Component: Component as string | ComponentType,
                visualState,
                props: configAndProps,
                createVisualElement: createGtkVisualElement,
                ProjectionNode: projectionFunctionality.ProjectionNode,
            }) as unknown as MotionContextProps["visualElement"];
        }
        const ref = useAnimatedRef(
            visualState,
            context.visualElement as unknown as VisualElement<Gtk.Widget> | undefined,
            externalRef,
        );
        return (
            <MotionContext.Provider value={context}>
                {MeasureLayoutComponent && context.visualElement ? (
                    <MeasureLayoutComponent
                        visualElement={context.visualElement as unknown as VisualElement<Gtk.Widget>}
                        {...configAndProps}
                    />
                ) : null}
                {useRenderedElement(Component as string | ComponentType, props, ref, forwardMotionProps)}
            </MotionContext.Provider>
        );
    };
    AnimatedComponent.displayName = `animated.${
        typeof Component === "string" ? Component : (Component.displayName ?? Component.name ?? "component")
    }`;
    return AnimatedComponent;
};
