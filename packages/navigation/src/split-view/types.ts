import type * as Adw from "@gtkx/gi/adw";
import type { AdwNavigationSplitViewProps } from "@gtkx/jsx/adw";
import type { EventMapCore, ParamListBase } from "@react-navigation/core";
import type { TabActionHelpers, TabNavigationState, TabRouterOptions } from "@react-navigation/routers";
import type { Ref } from "react";
import type { NavigationPageHeaderOptions } from "../navigator-header.js";
import type {
    NavigatorComponents,
    NavigatorNavigationProp,
    NavigatorOptions,
    NavigatorScreenProps,
} from "../navigator-types.js";

export type SplitViewScreenOptions = NavigationPageHeaderOptions & {
    title?: string;
    canPop?: boolean;
    iconName?: string;
    badgeNumber?: number;
    needsAttention?: boolean;
};

export type SplitViewNavigationEventMap = EventMapCore<TabNavigationState<ParamListBase>>;

export type SplitViewNavigationProp<
    ParamList extends ParamListBase = ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = NavigatorNavigationProp<
    ParamList,
    RouteName,
    NavigatorID,
    TabNavigationState<ParamList>,
    SplitViewScreenOptions,
    SplitViewNavigationEventMap,
    TabActionHelpers<ParamList>
>;

export type SplitViewScreenProps<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = NavigatorScreenProps<SplitViewNavigationProp<ParamList, RouteName, NavigatorID>, ParamList, RouteName>;

export type SplitViewNavigatorProps<ParamList extends ParamListBase = ParamListBase> = Omit<
    AdwNavigationSplitViewProps,
    | "children"
    | "ref"
    | "sidebar"
    | "content"
    | "showContent"
    | "onNotifyShowContent"
    | "onNotifyContent"
    | "onNotifySidebar"
> &
    NavigatorOptions<
        ParamList,
        TabNavigationState<ParamList>,
        SplitViewScreenOptions,
        SplitViewNavigationEventMap,
        TabActionHelpers<ParamList>
    > &
    Pick<TabRouterOptions, "backBehavior"> & {
        ref?: Ref<Adw.NavigationSplitView | null>;
    };

export type SplitViewNavigatorComponents<ParamList extends ParamListBase> = NavigatorComponents<
    ParamList,
    SplitViewNavigatorProps<ParamList>,
    TabNavigationState<ParamList>,
    SplitViewScreenOptions,
    SplitViewNavigationEventMap,
    TabActionHelpers<ParamList>
>;
