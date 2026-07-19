import type * as Adw from "@gtkx/gi/adw";
import type { AdwOverlaySplitViewProps } from "@gtkx/jsx/adw";
import type { EventMapCore, NavigationHelpers, ParamListBase, Route } from "@react-navigation/core";
import type {
    DrawerActionHelpers,
    DrawerNavigationState,
    DrawerRouterOptions,
    DrawerStatus,
} from "@react-navigation/routers";
import type { ReactElement, ReactNode, Ref } from "react";
import type { NavigatorHeaderOptions } from "../navigator-header.js";
import type {
    NavigatorComponents,
    NavigatorNavigationProp,
    NavigatorOptions,
    NavigatorScreenProps,
} from "../navigator-types.js";

export type DrawerScreenOptions = NavigatorHeaderOptions & {
    title?: string;
};

export type DrawerNavigationEventMap = EventMapCore<DrawerNavigationState<ParamListBase>> & {
    drawerToggle: { data: { open: boolean }; canPreventDefault: true };
};

export type DrawerNavigationProp<
    ParamList extends ParamListBase = ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = NavigatorNavigationProp<
    ParamList,
    RouteName,
    NavigatorID,
    DrawerNavigationState<ParamList>,
    DrawerScreenOptions,
    DrawerNavigationEventMap,
    DrawerActionHelpers<ParamList>
>;

export type DrawerScreenProps<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = NavigatorScreenProps<DrawerNavigationProp<ParamList, RouteName, NavigatorID>, ParamList, RouteName>;

export type DrawerDescriptor = {
    options: DrawerScreenOptions;
    route: Route<string>;
    navigation: DrawerNavigationProp<ParamListBase, string, string | undefined>;
    render(): ReactElement;
};

export type DrawerNavigationHelpers = NavigationHelpers<ParamListBase, DrawerNavigationEventMap> &
    DrawerActionHelpers<ParamListBase>;

export type DrawerContentProps = {
    state: DrawerNavigationState<ParamListBase>;
    navigation: DrawerNavigationHelpers;
    descriptors: Record<string, DrawerDescriptor>;
    status: DrawerStatus;
    collapsed: boolean;
};

export type DrawerNavigatorProps<ParamList extends ParamListBase = ParamListBase> = Omit<
    AdwOverlaySplitViewProps,
    "children" | "ref" | "sidebar" | "content" | "showSidebar" | "onNotifyShowSidebar"
> &
    NavigatorOptions<
        ParamList,
        DrawerNavigationState<ParamList>,
        DrawerScreenOptions,
        DrawerNavigationEventMap,
        DrawerActionHelpers<ParamList>
    > & {
        ref?: Ref<Adw.OverlaySplitView | null>;
        backBehavior?: DrawerRouterOptions["backBehavior"];
        defaultStatus?: DrawerStatus;
        drawerContent: (props: DrawerContentProps) => ReactNode;
    };

export type DrawerNavigatorComponents<ParamList extends ParamListBase> = NavigatorComponents<
    ParamList,
    DrawerNavigatorProps<ParamList>,
    DrawerNavigationState<ParamList>,
    DrawerScreenOptions,
    DrawerNavigationEventMap,
    DrawerActionHelpers<ParamList>
>;
