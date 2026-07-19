import type * as Adw from "@gtkx/gi/adw";
import { AdwViewStack } from "@gtkx/jsx/adw";
import {
    createNavigatorFactory,
    type NavigationHelpers,
    type ParamListBase,
    useNavigationBuilder,
} from "@react-navigation/core";
import {
    type TabActionHelpers,
    TabActions,
    type TabNavigationState,
    TabRouter,
    type TabRouterOptions,
} from "@react-navigation/routers";
import type { ReactNode } from "react";
import { definedNavigatorOptions } from "../navigator-options.js";
import type { TabStaticConfig } from "../static/navigator-configs.js";
import type { StaticNavigator } from "../static/types.js";
import { renderViewStackPage, type ViewStackRoute } from "../view-stack-page.js";
import type { TabNavigationEventMap, TabNavigatorComponents, TabNavigatorProps, TabScreenOptions } from "./types.js";

type TabDescriptor = { options: TabScreenOptions; render(): ReactNode };

const renderTabPage = (route: ViewStackRoute, descriptor: TabDescriptor | undefined): ReactNode =>
    descriptor ? renderViewStackPage(route, descriptor.options, descriptor.render()) : null;

type TabPressInput = {
    navigation: NavigationHelpers<ParamListBase, TabNavigationEventMap>;
    state: TabNavigationState<ParamListBase>;
    activeKey: string | undefined;
};

const createVisibleChildHandler =
    ({ navigation, state, activeKey }: TabPressInput) =>
    (value: string | null, self: Adw.ViewStack): void => {
        if (value === null || value === activeKey) return;
        const route = state.routes.find((candidate) => candidate.key === value);
        if (!route) return;
        const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
        if (event.defaultPrevented) {
            if (activeKey !== undefined) self.setVisibleChildName(activeKey);
            return;
        }
        navigation.dispatch({ ...TabActions.jumpTo(route.name), target: state.key });
    };

const TabNavigator = (props: TabNavigatorProps): ReactNode => {
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
        TabScreenOptions,
        TabNavigationEventMap
    >(TabRouter, {
        children,
        id,
        ...(backBehavior !== undefined && { backBehavior }),
        ...definedNavigatorOptions({ initialRouteName, layout, screenListeners, screenOptions, screenLayout }),
    });

    const activeKey = state.routes[state.index]?.key;

    const handleNotifyVisibleChildName = createVisibleChildHandler({ navigation, state, activeKey });

    return (
        <NavigationContent>
            <AdwViewStack
                ref={ref}
                {...viewProps}
                visibleChildName={activeKey}
                onNotifyVisibleChildName={handleNotifyVisibleChildName}
            >
                {state.routes.map((route) => renderTabPage(route, descriptors[route.key]))}
            </AdwViewStack>
        </NavigationContent>
    );
};

export const createTabNavigator: {
    <ParamList extends ParamListBase>(): TabNavigatorComponents<ParamList>;
    <const Config extends TabStaticConfig>(config: Config): StaticNavigator<Config, TabNavigatorProps>;
} = (config?: TabStaticConfig) => createNavigatorFactory(TabNavigator)(config);
