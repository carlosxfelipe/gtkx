import type * as Adw from "@gtkx/gi/adw";
import type { AdwNavigationSplitViewProps } from "@gtkx/jsx/adw";
import type {
    DefaultNavigatorOptions,
    EventMapCore,
    NavigationProp,
    ParamListBase,
    RouteConfig,
    RouteGroupConfig,
    RouteProp,
} from "@react-navigation/core";
import type { TabActionHelpers, TabNavigationState } from "@react-navigation/routers";
import type { ReactNode, Ref } from "react";

export type SplitViewScreenOptions = {
    title?: string;
};

export type SplitViewNavigationEventMap = EventMapCore<TabNavigationState<ParamListBase>>;

export type SplitViewNavigationProp<
    ParamList extends ParamListBase = ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = NavigationProp<
    ParamList,
    RouteName,
    NavigatorID,
    TabNavigationState<ParamList>,
    SplitViewScreenOptions,
    SplitViewNavigationEventMap
> &
    TabActionHelpers<ParamList>;

export type SplitViewScreenProps<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = {
    navigation: SplitViewNavigationProp<ParamList, RouteName, NavigatorID>;
    route: RouteProp<ParamList, RouteName>;
};

export type SplitViewNavigatorProps = Omit<
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
    Omit<
        DefaultNavigatorOptions<
            ParamListBase,
            string | undefined,
            TabNavigationState<ParamListBase>,
            SplitViewScreenOptions,
            SplitViewNavigationEventMap,
            SplitViewNavigationProp<ParamListBase>
        >,
        "UNSTABLE_router" | "UNSTABLE_routeNamesChangeBehavior"
    > & {
        ref?: Ref<Adw.NavigationSplitView | null>;
    };

export type SplitViewNavigatorComponents<ParamList extends ParamListBase> = {
    Navigator: (props: SplitViewNavigatorProps) => ReactNode;
    Screen: <RouteName extends keyof ParamList>(
        props: RouteConfig<
            ParamList,
            RouteName,
            TabNavigationState<ParamList>,
            SplitViewScreenOptions,
            SplitViewNavigationEventMap,
            SplitViewNavigationProp<ParamList, RouteName>
        >,
    ) => ReactNode;
    Group: (
        props: RouteGroupConfig<ParamList, SplitViewScreenOptions, SplitViewNavigationProp<ParamList>>,
    ) => ReactNode;
};
