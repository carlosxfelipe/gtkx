import { AdwNavigationPage, AdwNavigationSplitView, AdwViewStack } from "@gtkx/jsx/adw";
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
import type { SplitViewStaticConfig } from "../static/navigator-configs.js";
import type { StaticNavigator } from "../static/types.js";
import { renderViewStackPage } from "../view-stack-page.js";
import type {
    SplitViewNavigationEventMap,
    SplitViewNavigatorComponents,
    SplitViewNavigatorProps,
    SplitViewScreenOptions,
} from "./types.js";

type PaneRoute = { key: string; name: string };
type PaneDescriptor = { options: SplitViewScreenOptions; render(): ReactNode };
type Pane = { route: PaneRoute; descriptor: PaneDescriptor };

const resolvePane = (route: PaneRoute | undefined, descriptors: Record<string, PaneDescriptor>): Pane => {
    if (!route) throw new Error("The split-view navigator requires a sidebar screen and at least one content screen");
    const descriptor = descriptors[route.key];
    if (!descriptor) throw new Error("The split-view navigator is missing a descriptor for one of its screens");
    return { route, descriptor };
};

const renderPage = ({ route, descriptor }: Pane, children: ReactNode): ReactElement => (
    <AdwNavigationPage
        tag={route.key}
        title={descriptor.options.title ?? route.name}
        canPop={descriptor.options.canPop}
    >
        {children}
    </AdwNavigationPage>
);

const renderContent = (panes: Pane[], focused: Pane): ReactElement =>
    renderPage(
        focused,
        <AdwViewStack visibleChildName={focused.route.key}>
            {panes.map((pane) => renderViewStackPage(pane.route, pane.descriptor.options, pane.descriptor.render()))}
        </AdwViewStack>,
    );

const SplitViewNavigator = (props: SplitViewNavigatorProps): ReactNode => {
    const {
        ref,
        id,
        initialRouteName,
        backBehavior,
        children,
        layout,
        screenListeners,
        screenOptions,
        screenLayout,
        ...viewProps
    } = props;

    const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
        TabNavigationState<ParamListBase>,
        TabRouterOptions,
        TabActionHelpers<ParamListBase>,
        SplitViewScreenOptions,
        SplitViewNavigationEventMap
    >(TabRouter, {
        children,
        id,
        backBehavior: backBehavior ?? "initialRoute",
        ...definedNavigatorOptions({ initialRouteName, layout, screenListeners, screenOptions, screenLayout }),
    });

    const sidebar = resolvePane(state.routes[0], descriptors);
    const contentPanes = state.routes.slice(1).map((route) => resolvePane(route, descriptors));
    const showContent = state.index > 0;
    const focusedContent = resolvePane(state.routes[showContent ? state.index : 1], descriptors);

    const handleNotifyShowContent = (value: boolean | null): void => {
        const next = value ?? false;
        if (next === showContent) return;
        navigation.dispatch({
            ...TabActions.jumpTo(next ? focusedContent.route.name : sidebar.route.name),
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
                sidebar={renderPage(sidebar, sidebar.descriptor.render())}
                content={renderContent(contentPanes, focusedContent)}
            />
        </NavigationContent>
    );
};

export const createSplitViewNavigator: {
    <ParamList extends ParamListBase>(): SplitViewNavigatorComponents<ParamList>;
    <const Config extends SplitViewStaticConfig>(config: Config): StaticNavigator<Config, SplitViewNavigatorProps>;
} = (config?: SplitViewStaticConfig) => createNavigatorFactory(SplitViewNavigator)(config);
