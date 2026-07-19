import type {
    DefaultNavigatorOptions,
    EventMapBase,
    NavigationProp,
    NavigationState,
    ParamListBase,
    RouteConfig,
    RouteGroupConfig,
    RouteProp,
} from "@react-navigation/core";
import type { ReactNode } from "react";

export type NavigatorNavigationProp<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList,
    NavigatorID extends string | undefined,
    State extends NavigationState,
    ScreenOptions extends object,
    EventMap extends EventMapBase,
    ActionHelpers,
> = NavigationProp<ParamList, RouteName, NavigatorID, State, ScreenOptions, EventMap> & ActionHelpers;

export type NavigatorScreenProps<Prop, ParamList extends ParamListBase, RouteName extends keyof ParamList> = {
    navigation: Prop;
    route: RouteProp<ParamList, RouteName>;
};

export type NavigatorOptions<
    ParamList extends ParamListBase,
    State extends NavigationState,
    ScreenOptions extends object,
    EventMap extends EventMapBase,
    ActionHelpers,
> = DefaultNavigatorOptions<
    ParamList,
    string | undefined,
    State,
    ScreenOptions,
    EventMap,
    NavigatorNavigationProp<ParamList, keyof ParamList, undefined, State, ScreenOptions, EventMap, ActionHelpers>
>;

export type NavigatorComponents<
    ParamList extends ParamListBase,
    NavigatorProps,
    State extends NavigationState,
    ScreenOptions extends object,
    EventMap extends EventMapBase,
    ActionHelpers,
> = {
    Navigator: (props: NavigatorProps) => ReactNode;
    Screen: <RouteName extends keyof ParamList>(
        props: RouteConfig<
            ParamList,
            RouteName,
            State,
            ScreenOptions,
            EventMap,
            NavigatorNavigationProp<ParamList, RouteName, undefined, State, ScreenOptions, EventMap, ActionHelpers>
        >,
    ) => ReactNode;
    Group: (
        props: RouteGroupConfig<
            ParamList,
            ScreenOptions,
            NavigatorNavigationProp<
                ParamList,
                keyof ParamList,
                undefined,
                State,
                ScreenOptions,
                EventMap,
                ActionHelpers
            >
        >,
    ) => ReactNode;
};
