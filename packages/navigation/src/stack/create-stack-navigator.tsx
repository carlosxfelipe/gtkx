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
import { type ReactNode, type RefCallback, useCallback, useLayoutEffect, useReducer, useRef, useState } from "react";
import { definedNavigatorOptions } from "../navigator-options.js";
import { type PageRegistry, PageRegistryContext, usePageRegistry } from "./page-registry.js";
import { applyStackDiff } from "./stack-diff.js";
import { StackPage } from "./stack-page.js";
import type {
    StackNavigationEventMap,
    StackNavigatorComponents,
    StackNavigatorProps,
    StackScreenOptions,
} from "./types.js";

const useWidgetStackSync = (
    view: Adw.NavigationView | null,
    desired: string[],
    registry: PageRegistry,
    onWidgetPop: (tag: string) => void,
): void => {
    const applyingRef = useRef(false);

    useLayoutEffect(() => {
        if (!view) return;
        applyingRef.current = true;
        try {
            applyStackDiff(view, desired, registry);
        } finally {
            applyingRef.current = false;
        }
    });

    useSignal(view, "popped", (page: Adw.NavigationPage) => {
        if (applyingRef.current) return;
        const tag = page.getTag();
        if (tag !== null) onWidgetPop(tag);
    });
};

type PageDescriptor = { options: StackScreenOptions; render(): ReactNode };

const renderStackPage = (route: { key: string; name: string }, descriptor: PageDescriptor | undefined): ReactNode =>
    descriptor ? (
        <StackPage key={route.key} routeKey={route.key} routeName={route.name} options={descriptor.options}>
            {descriptor.render()}
        </StackPage>
    ) : null;

const StackNavigator = (props: StackNavigatorProps): ReactNode => {
    const { ref, id, initialRouteName, children, layout, screenListeners, screenOptions, screenLayout, ...viewProps } =
        props;

    const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
        StackNavigationState<ParamListBase>,
        StackRouterOptions,
        StackActionHelpers<ParamListBase>,
        StackScreenOptions,
        StackNavigationEventMap
    >(StackRouter, {
        children,
        id,
        ...definedNavigatorOptions({ initialRouteName, layout, screenListeners, screenOptions, screenLayout }),
    });

    const [view, setView] = useState<Adw.NavigationView | null>(null);
    const captureView = useCallback<RefCallback<Adw.NavigationView>>((value) => setView(value), []);
    const setRef = useMergeRefs<Adw.NavigationView>(captureView, ref);

    const registry = usePageRegistry();
    const [, forceSync] = useReducer((generation: number) => generation + 1, 0);

    useWidgetStackSync(
        view,
        state.routes.map((route) => route.key),
        registry,
        (tag) => {
            navigation.dispatch({ ...StackActions.pop(), source: tag, target: state.key });
            forceSync();
        },
    );

    return (
        <PageRegistryContext.Provider value={registry}>
            <NavigationContent>
                <AdwNavigationView ref={setRef} {...viewProps} />
                {state.routes.map((route) => renderStackPage(route, descriptors[route.key]))}
            </NavigationContent>
        </PageRegistryContext.Provider>
    );
};

export const createStackNavigator = <ParamList extends ParamListBase>(): StackNavigatorComponents<ParamList> =>
    createNavigatorFactory(StackNavigator)();
