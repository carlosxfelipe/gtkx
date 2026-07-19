import type { ParamListBase } from "@react-navigation/core";
import type { DrawerNavigationState, StackNavigationState, TabNavigationState } from "@react-navigation/routers";
import type { DrawerNavigationEventMap, DrawerNavigatorProps, DrawerScreenOptions } from "../drawer/types.js";
import type {
    SplitViewNavigationEventMap,
    SplitViewNavigatorProps,
    SplitViewScreenOptions,
} from "../split-view/types.js";
import type { StackNavigationEventMap, StackNavigatorProps, StackScreenOptions } from "../stack/types.js";
import type { TabNavigationEventMap, TabNavigatorProps, TabScreenOptions } from "../tab/types.js";
import type { NavigatorStaticConfig } from "./types.js";

export type StackStaticConfig = NavigatorStaticConfig<
    StackNavigatorProps,
    StackNavigationState<ParamListBase>,
    StackScreenOptions,
    StackNavigationEventMap
>;

export type TabStaticConfig = NavigatorStaticConfig<
    TabNavigatorProps,
    TabNavigationState<ParamListBase>,
    TabScreenOptions,
    TabNavigationEventMap
>;

export type DrawerStaticConfig = NavigatorStaticConfig<
    DrawerNavigatorProps,
    DrawerNavigationState<ParamListBase>,
    DrawerScreenOptions,
    DrawerNavigationEventMap
>;

export type SplitViewStaticConfig = NavigatorStaticConfig<
    SplitViewNavigatorProps,
    TabNavigationState<ParamListBase>,
    SplitViewScreenOptions,
    SplitViewNavigationEventMap
>;
