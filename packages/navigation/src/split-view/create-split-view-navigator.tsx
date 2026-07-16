import { AdwNavigationPage, AdwNavigationSplitView } from "@gtkx/jsx/adw";
import { createNavigatorFactory, type ParamListBase, useNavigationBuilder } from "@react-navigation/core";
import {
    type TabActionHelpers,
    TabActions,
    type TabNavigationState,
    TabRouter,
    type TabRouterOptions,
} from "@react-navigation/routers";
import type { ReactElement, ReactNode } from "react";
import { definedNavigatorOptions } from "../navigator-options.js";
import type {
    SplitViewNavigationEventMap,
    SplitViewNavigatorComponents,
    SplitViewNavigatorProps,
    SplitViewScreenOptions,
} from "./types.js";

type PaneRoute = { key: string; name: string };
type PaneDescriptor = { options: SplitViewScreenOptions; render(): ReactNode };
type Pane = { route: PaneRoute; descriptor: PaneDescriptor };

const resolvePanes = (routes: PaneRoute[], descriptors: Record<string, PaneDescriptor>): [Pane, Pane] => {
    const [sidebarRoute, contentRoute] = routes;
    if (!sidebarRoute || !contentRoute || routes.length !== 2) {
        throw new Error("The split-view navigator requires exactly two screens: the sidebar and the content");
    }
    const sidebarDescriptor = descriptors[sidebarRoute.key];
    const contentDescriptor = descriptors[contentRoute.key];
    if (!sidebarDescriptor || !contentDescriptor) {
        throw new Error("The split-view navigator is missing a descriptor for one of its screens");
    }
    return [
        { route: sidebarRoute, descriptor: sidebarDescriptor },
        { route: contentRoute, descriptor: contentDescriptor },
    ];
};

const renderPane = ({ route, descriptor }: Pane): ReactElement => (
    <AdwNavigationPage tag={route.key} title={descriptor.options.title ?? route.name}>
        {descriptor.render()}
    </AdwNavigationPage>
);

const SplitViewNavigator = (props: SplitViewNavigatorProps): ReactNode => {
    const { ref, id, initialRouteName, children, layout, screenListeners, screenOptions, screenLayout, ...viewProps } =
        props;

    const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
        TabNavigationState<ParamListBase>,
        TabRouterOptions,
        TabActionHelpers<ParamListBase>,
        SplitViewScreenOptions,
        SplitViewNavigationEventMap
    >(TabRouter, {
        children,
        id,
        backBehavior: "initialRoute",
        ...definedNavigatorOptions({ initialRouteName, layout, screenListeners, screenOptions, screenLayout }),
    });

    const [sidebar, content] = resolvePanes(state.routes, descriptors);
    const showContent = state.index === 1;

    const handleNotifyShowContent = (value: boolean | null): void => {
        const next = value ?? false;
        if (next === showContent) return;
        navigation.dispatch({
            ...TabActions.jumpTo(next ? content.route.name : sidebar.route.name),
            target: state.key,
        });
    };

    return (
        <NavigationContent>
            <AdwNavigationSplitView
                ref={ref}
                {...viewProps}
                showContent={showContent}
                onNotifyShowContent={handleNotifyShowContent}
                sidebar={renderPane(sidebar)}
                content={renderPane(content)}
            />
        </NavigationContent>
    );
};

export const createSplitViewNavigator = <ParamList extends ParamListBase>(): SplitViewNavigatorComponents<ParamList> =>
    createNavigatorFactory(SplitViewNavigator)();
