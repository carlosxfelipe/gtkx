import type {
    EventMapBase,
    NavigationListBase,
    NavigationState,
    NavigatorTypeBagBase,
    ParamListBase,
    PathConfigMap,
    StaticConfig,
} from "@react-navigation/core";
import type { ComponentType, ReactNode } from "react";
import type { LinkingConfig, LinkingOptions } from "../linking/types.js";
import type { NavigationContainerProps } from "../navigation-container.js";

export type StaticRootComponent = (props: Record<string, never>) => ReactNode;

export type NavigatorStaticConfig<
    NavigatorProps,
    State extends NavigationState,
    ScreenOptions extends object,
    EventMap extends EventMapBase,
> = StaticConfig<{
    ParamList: ParamListBase;
    NavigatorID: string | undefined;
    State: State;
    ScreenOptions: ScreenOptions;
    EventMap: EventMap;
    NavigationList: NavigationListBase<ParamListBase>;
    Navigator: ComponentType<NavigatorProps>;
}>;

export type StaticNavigatorComponent<NavigatorProps> = (props: Partial<Omit<NavigatorProps, "children">>) => ReactNode;

export type DecoratedStaticNavigator<Config> = {
    config: Config;
    getComponent: () => StaticRootComponent;
};

export type StaticNavigator<Config, NavigatorProps> = {
    config: Config;
    with: (
        Component: ComponentType<{ Navigator: StaticNavigatorComponent<NavigatorProps> }>,
    ) => DecoratedStaticNavigator<Config>;
    getComponent: () => StaticNavigatorComponent<NavigatorProps>;
};

export type StaticNavigationTree = {
    config: StaticConfig<NavigatorTypeBagBase>;
    getComponent: () => StaticRootComponent;
};

export type StaticLinkingOptions = Omit<LinkingOptions<ParamListBase>, "config" | "enabled"> & {
    enabled?: boolean | "auto";
    config?: Partial<LinkingConfig<ParamListBase>>;
};

export type StaticNavigationProps = Omit<NavigationContainerProps<ParamListBase>, "children" | "linking"> & {
    linking?: StaticLinkingOptions;
};

export type StaticPathConfig = PathConfigMap<ParamListBase>;
