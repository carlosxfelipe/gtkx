import type * as Adw from "@gtkx/gi/adw";
import { AdwNavigationView } from "@gtkx/jsx/adw";
import { useSignal } from "@gtkx/react";
import { useMergeRefs } from "@gtkx/react/internal";
import { createNavigatorFactory, type ParamListBase, useNavigationBuilder } from "@react-navigation/core";
import {
    type StackActionHelpers,
    StackActions,
    type StackNavigationState,
    StackRouter,
    type StackRouterOptions,
} from "@react-navigation/routers";
import { type ReactNode, useLayoutEffect, useReducer, useRef, useState } from "react";
import { definedNavigatorOptions } from "../navigator-options.js";
import type { StackStaticConfig } from "../static/navigator-configs.js";
import type { StaticNavigator } from "../static/types.js";
import { applyStackDiff, readLiveTags } from "./stack-diff.js";
import { StackModal } from "./stack-modal.js";
import { StackPage, type StackPageIdentity } from "./stack-page.js";
import { type PageTransitionHandlers, useRenderedPages } from "./stack-pages.js";
import { stackPageTags, useStackTags } from "./stack-tags.js";
import type {
    StackNavigationEventMap,
    StackNavigatorComponents,
    StackNavigatorProps,
    StackScreenOptions,
} from "./types.js";

type StackSyncHandlers = {
    releaseIdle: (liveTags: string[]) => void;
    onWidgetPop: (tag: string) => void;
    onWidgetPush?: () => void;
    onWidgetReplace?: () => void;
};

const useWidgetStackSync = (view: Adw.NavigationView | null, desired: string[], handlers: StackSyncHandlers): void => {
    const applyingRef = useRef(false);

    useLayoutEffect(() => {
        if (!view) return;
        applyingRef.current = true;
        try {
            applyStackDiff(view, desired);
        } finally {
            applyingRef.current = false;
        }
        handlers.releaseIdle(readLiveTags(view));
    });

    useSignal(view, "popped", (page: Adw.NavigationPage) => {
        if (applyingRef.current) return;
        const tag = page.getTag();
        if (tag !== null) handlers.onWidgetPop(tag);
    });

    useSignal(view, "pushed", () => {
        if (!applyingRef.current) handlers.onWidgetPush?.();
    });

    useSignal(view, "replaced", () => {
        if (!applyingRef.current) handlers.onWidgetReplace?.();
    });
};

type PageDescriptor = { options: StackScreenOptions; render(): ReactNode };

const isModalDescriptor = (descriptor: PageDescriptor | undefined): boolean =>
    descriptor !== undefined && (descriptor.options.presentation ?? "page") !== "page";

const pageRouteKeys = (
    routes: { key: string }[],
    descriptors: Record<string, PageDescriptor | undefined>,
): string[] => {
    const keys = routes.filter((route) => !isModalDescriptor(descriptors[route.key])).map((route) => route.key);
    if (keys.length === 0) throw new Error('The stack navigator requires at least one route with presentation "page"');
    return keys;
};

const renderStackPage = (
    route: { key: string; name: string },
    descriptor: PageDescriptor | undefined,
    handlers: PageTransitionHandlers,
    identity: StackPageIdentity,
): ReactNode =>
    descriptor ? (
        <StackPage
            key={route.key}
            routeKey={route.key}
            routeName={route.name}
            identity={identity}
            options={descriptor.options}
            handlers={handlers}
        >
            {descriptor.render()}
        </StackPage>
    ) : null;

const renderStackModal = (
    route: { key: string; name: string },
    descriptor: PageDescriptor | undefined,
    onDismiss: (routeKey: string) => void,
): ReactNode =>
    isModalDescriptor(descriptor) && descriptor ? (
        <StackModal
            key={route.key}
            routeKey={route.key}
            routeName={route.name}
            options={descriptor.options}
            onDismiss={onDismiss}
        >
            {descriptor.render()}
        </StackModal>
    ) : null;

const NO_TRANSITION: PageTransitionHandlers = { onHiding: () => undefined, onHidden: () => undefined };

const renderPreloadedPage = (route: { key: string; name: string }, descriptor: PageDescriptor): ReactNode =>
    isModalDescriptor(descriptor)
        ? null
        : renderStackPage(route, descriptor, NO_TRANSITION, {
              tag: descriptor.options.tag ?? route.key,
              focused: false,
              onTransition: () => undefined,
          });

const useStackBuilder = (props: StackNavigatorProps) =>
    useNavigationBuilder<
        StackNavigationState<ParamListBase>,
        StackRouterOptions,
        StackActionHelpers<ParamListBase>,
        StackScreenOptions,
        StackNavigationEventMap
    >(StackRouter, {
        children: props.children,
        id: props.id,
        ...definedNavigatorOptions({
            initialRouteName: props.initialRouteName,
            layout: props.layout,
            screenListeners: props.screenListeners,
            screenOptions: props.screenOptions,
            screenLayout: props.screenLayout,
        }),
    });

const navigationViewProps = (props: StackNavigatorProps) => {
    const {
        ref,
        id,
        initialRouteName,
        children,
        layout,
        screenListeners,
        screenOptions,
        screenLayout,
        onPushed,
        onReplaced,
        ...viewProps
    } = props;
    return viewProps;
};

const StackNavigator = (props: StackNavigatorProps): ReactNode => {
    const { state, descriptors, describe, navigation, NavigationContent } = useStackBuilder(props);
    const [view, setView] = useState<Adw.NavigationView | null>(null);
    const setRef = useMergeRefs<Adw.NavigationView>(setView, props.ref);
    const [, forceSync] = useReducer((generation: number) => generation + 1, 0);

    const pageKeys = pageRouteKeys(state.routes, descriptors);
    const routesByKey = new Map(state.routes.map((route) => [route.key, route]));
    const tags = useStackTags(stackPageTags(pageKeys, (key) => descriptors[key]?.options.tag));
    const focusedKey = state.routes[state.index]?.key;

    const emitTransition = (routeKey: string, ending: boolean, closing: boolean): void => {
        navigation.emit({ type: ending ? "transitionEnd" : "transitionStart", target: routeKey, data: { closing } });
    };

    const dismissModal = (routeKey: string): void => {
        navigation.dispatch({ ...StackActions.pop(), source: routeKey, target: state.key });
    };

    const renderPage = (key: string, handlers: PageTransitionHandlers): ReactNode => {
        const route = routesByKey.get(key);
        if (!route) return null;
        const identity = {
            tag: tags.tagOf(key),
            focused: key === focusedKey,
            onTransition: (ending: boolean, closing: boolean) => emitTransition(key, ending, closing),
        };
        return renderStackPage(route, descriptors[key], handlers, identity);
    };

    const { nodes, rendered, releaseIdle } = useRenderedPages(pageKeys, renderPage);
    tags.retain(rendered);

    useWidgetStackSync(view, pageKeys.map(tags.tagOf), {
        releaseIdle: (liveTags) => releaseIdle(liveTags.map(tags.routeKeyOf)),
        onWidgetPop: (tag) => {
            navigation.dispatch({ ...StackActions.pop(), source: tags.routeKeyOf(tag), target: state.key });
            forceSync();
        },
        ...(props.onPushed !== undefined && { onWidgetPush: props.onPushed }),
        ...(props.onReplaced !== undefined && { onWidgetReplace: props.onReplaced }),
    });

    return (
        <NavigationContent>
            <AdwNavigationView ref={setRef} {...navigationViewProps(props)}>
                {[...nodes, ...state.preloadedRoutes.map((route) => renderPreloadedPage(route, describe(route, true)))]}
            </AdwNavigationView>
            {state.routes.map((route) => renderStackModal(route, descriptors[route.key], dismissModal))}
        </NavigationContent>
    );
};

export const createStackNavigator: {
    <ParamList extends ParamListBase>(): StackNavigatorComponents<ParamList>;
    <const Config extends StackStaticConfig>(config: Config): StaticNavigator<Config, StackNavigatorProps>;
} = (config?: StackStaticConfig) => createNavigatorFactory(StackNavigator)(config);
