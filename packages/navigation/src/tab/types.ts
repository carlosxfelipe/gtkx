import type * as Adw from "@gtkx/gi/adw";
import type { AdwViewStackProps } from "@gtkx/jsx/adw";
import type { EventMapCore, ParamListBase } from "@react-navigation/core";
import type { TabActionHelpers, TabNavigationState, TabRouterOptions } from "@react-navigation/routers";
import type { Ref } from "react";
import type {
    NavigatorComponents,
    NavigatorNavigationProp,
    NavigatorOptions,
    NavigatorScreenProps,
} from "../navigator-types.js";

export type TabBackBehavior = NonNullable<TabRouterOptions["backBehavior"]>;

export type TabScreenOptions = {
    title?: string;
    iconName?: string;
    badgeNumber?: number;
    needsAttention?: boolean;
};

export type TabNavigationEventMap = EventMapCore<TabNavigationState<ParamListBase>> & {
    tabPress: { data: undefined; canPreventDefault: true };
};

export type TabNavigationProp<
    ParamList extends ParamListBase = ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = NavigatorNavigationProp<
    ParamList,
    RouteName,
    NavigatorID,
    TabNavigationState<ParamList>,
    TabScreenOptions,
    TabNavigationEventMap,
    TabActionHelpers<ParamList>
>;

export type TabScreenProps<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = NavigatorScreenProps<TabNavigationProp<ParamList, RouteName, NavigatorID>, ParamList, RouteName>;

export type TabNavigatorProps<ParamList extends ParamListBase = ParamListBase> = Omit<
    AdwViewStackProps,
    "children" | "ref" | "visibleChild" | "visibleChildName" | "onNotifyVisibleChildName"
> &
    NavigatorOptions<
        ParamList,
        TabNavigationState<ParamList>,
        TabScreenOptions,
        TabNavigationEventMap,
        TabActionHelpers<ParamList>
    > &
    Pick<TabRouterOptions, "backBehavior"> & {
        ref?: Ref<Adw.ViewStack | null>;
    };

export type TabNavigatorComponents<ParamList extends ParamListBase> = NavigatorComponents<
    ParamList,
    TabNavigatorProps<ParamList>,
    TabNavigationState<ParamList>,
    TabScreenOptions,
    TabNavigationEventMap,
    TabActionHelpers<ParamList>
>;
