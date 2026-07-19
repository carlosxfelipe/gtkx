import type * as Adw from "@gtkx/gi/adw";
import { AdwOverlaySplitView } from "@gtkx/jsx/adw";
import {
    createNavigatorFactory,
    type NavigationHelpers,
    type ParamListBase,
    type Route,
    useNavigationBuilder,
} from "@react-navigation/core";
import {
    type DrawerActionHelpers,
    DrawerActions,
    type DrawerNavigationState,
    DrawerRouter,
    type DrawerRouterOptions,
} from "@react-navigation/routers";
import { type ReactNode, useState } from "react";
import { definedNavigatorOptions } from "../navigator-options.js";
import type { DrawerStaticConfig } from "../static/navigator-configs.js";
import type { StaticNavigator } from "../static/types.js";
import { drawerSlots } from "./drawer-slots.js";
import { getDrawerStatusFromState } from "./drawer-status.js";
import type {
    DrawerNavigationEventMap,
    DrawerNavigatorComponents,
    DrawerNavigatorProps,
    DrawerScreenOptions,
} from "./types.js";

type DrawerBuilderInput = Pick<
    DrawerNavigatorProps,
    | "backBehavior"
    | "children"
    | "defaultStatus"
    | "id"
    | "initialRouteName"
    | "layout"
    | "screenLayout"
    | "screenListeners"
    | "screenOptions"
>;

const useDrawerNavigation = (input: DrawerBuilderInput) =>
    useNavigationBuilder<
        DrawerNavigationState<ParamListBase>,
        DrawerRouterOptions,
        DrawerActionHelpers<ParamListBase>,
        DrawerScreenOptions,
        DrawerNavigationEventMap
    >(DrawerRouter, {
        children: input.children,
        id: input.id,
        ...(input.defaultStatus !== undefined && { defaultStatus: input.defaultStatus }),
        ...(input.backBehavior !== undefined && { backBehavior: input.backBehavior }),
        ...definedNavigatorOptions({
            initialRouteName: input.initialRouteName,
            layout: input.layout,
            screenListeners: input.screenListeners,
            screenOptions: input.screenOptions,
            screenLayout: input.screenLayout,
        }),
    });

const resolveFocusedRoute = (state: DrawerNavigationState<ParamListBase>): Route<string> => {
    const route = state.routes[state.index];
    if (!route) throw new Error("The drawer navigator has no focused route");
    return route;
};

type DrawerToggleInput = {
    navigation: NavigationHelpers<ParamListBase, DrawerNavigationEventMap>;
    stateKey: string;
    focusedKey: string;
    isOpen: boolean;
};

const createShowSidebarHandler =
    ({ navigation, stateKey, focusedKey, isOpen }: DrawerToggleInput) =>
    (value: boolean | null, self: Adw.OverlaySplitView): void => {
        if (!self.getCollapsed()) return;
        const open = value ?? false;
        if (open === isOpen) return;
        const event = navigation.emit({
            type: "drawerToggle",
            target: focusedKey,
            data: { open },
            canPreventDefault: true,
        });
        if (event.defaultPrevented) {
            self.setShowSidebar(isOpen);
            return;
        }
        navigation.dispatch({ ...(open ? DrawerActions.openDrawer() : DrawerActions.closeDrawer()), target: stateKey });
    };

type CollapseHandler = (value: boolean | null, self: Adw.OverlaySplitView) => void;

const useCollapsedState = (
    collapsed: boolean | null | undefined,
    onNotifyCollapsed: CollapseHandler | null | undefined,
): [boolean, CollapseHandler] => {
    const [isCollapsed, setIsCollapsed] = useState(collapsed ?? false);
    return [
        isCollapsed,
        (value, self) => {
            setIsCollapsed(value ?? false);
            onNotifyCollapsed?.(value, self);
        },
    ];
};

const DrawerNavigator = (props: DrawerNavigatorProps): ReactNode => {
    const {
        ref,
        id,
        initialRouteName,
        children,
        layout,
        screenListeners,
        screenOptions,
        screenLayout,
        backBehavior,
        defaultStatus,
        drawerContent,
        collapsed,
        onNotifyCollapsed,
        ...viewProps
    } = props;
    const [isCollapsed, handleNotifyCollapsed] = useCollapsedState(collapsed, onNotifyCollapsed);

    const { state, descriptors, navigation, NavigationContent } = useDrawerNavigation(props);

    const status = getDrawerStatusFromState(state);
    const isOpen = status === "open";

    const showSidebar = isCollapsed ? isOpen : true;
    const focusedKey = resolveFocusedRoute(state).key;

    const handleNotifyShowSidebar = createShowSidebarHandler({ navigation, stateKey: state.key, focusedKey, isOpen });

    const { sidebar, content } = drawerSlots({
        render: drawerContent,
        state,
        navigation,
        descriptors,
        status,
        collapsed: isCollapsed,
        focusedKey,
    });

    return (
        <NavigationContent>
            <AdwOverlaySplitView
                ref={ref}
                {...viewProps}
                {...(collapsed !== undefined && { collapsed })}
                onNotifyCollapsed={handleNotifyCollapsed}
                showSidebar={showSidebar}
                onNotifyShowSidebar={handleNotifyShowSidebar}
                sidebar={sidebar}
                content={content}
            />
        </NavigationContent>
    );
};

export const createDrawerNavigator: {
    <ParamList extends ParamListBase>(): DrawerNavigatorComponents<ParamList>;
    <const Config extends DrawerStaticConfig>(config: Config): StaticNavigator<Config, DrawerNavigatorProps>;
} = (config?: DrawerStaticConfig) => createNavigatorFactory(DrawerNavigator)(config);
