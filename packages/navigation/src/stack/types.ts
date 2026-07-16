import type * as Adw from "@gtkx/gi/adw";
import type { AdwNavigationViewProps } from "@gtkx/jsx/adw";
import type {
    DefaultNavigatorOptions,
    EventMapCore,
    NavigationProp,
    ParamListBase,
    RouteConfig,
    RouteGroupConfig,
    RouteProp,
} from "@react-navigation/core";
import type { StackActionHelpers, StackNavigationState } from "@react-navigation/routers";
import type { ReactNode, Ref } from "react";

export type StackScreenOptions = {
    title?: string;
    canPop?: boolean;
};

export type StackNavigationEventMap = EventMapCore<StackNavigationState<ParamListBase>>;

export type StackNavigationProp<
    ParamList extends ParamListBase = ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = NavigationProp<
    ParamList,
    RouteName,
    NavigatorID,
    StackNavigationState<ParamList>,
    StackScreenOptions,
    StackNavigationEventMap
> &
    StackActionHelpers<ParamList>;

export type StackScreenProps<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = {
    navigation: StackNavigationProp<ParamList, RouteName, NavigatorID>;
    route: RouteProp<ParamList, RouteName>;
};

export type StackNavigatorProps = Omit<
    AdwNavigationViewProps,
    | "children"
    | "ref"
    | "onPopped"
    | "onPushed"
    | "onReplaced"
    | "onGetNextPage"
    | "onNotifyNavigationStack"
    | "onNotifyVisiblePage"
    | "onNotifyVisiblePageTag"
> &
    Omit<
        DefaultNavigatorOptions<
            ParamListBase,
            string | undefined,
            StackNavigationState<ParamListBase>,
            StackScreenOptions,
            StackNavigationEventMap,
            StackNavigationProp<ParamListBase>
        >,
        "UNSTABLE_router" | "UNSTABLE_routeNamesChangeBehavior"
    > & {
        ref?: Ref<Adw.NavigationView | null>;
    };

export type StackNavigatorComponents<ParamList extends ParamListBase> = {
    Navigator: (props: StackNavigatorProps) => ReactNode;
    Screen: <RouteName extends keyof ParamList>(
        props: RouteConfig<
            ParamList,
            RouteName,
            StackNavigationState<ParamList>,
            StackScreenOptions,
            StackNavigationEventMap,
            StackNavigationProp<ParamList, RouteName>
        >,
    ) => ReactNode;
    Group: (props: RouteGroupConfig<ParamList, StackScreenOptions, StackNavigationProp<ParamList>>) => ReactNode;
};
