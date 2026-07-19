import { createPathConfigForStaticNavigation, type ParamListBase } from "@react-navigation/core";
import type { LinkingConfig, LinkingOptions } from "../linking/types.js";
import type { StaticLinkingOptions, StaticNavigationTree, StaticPathConfig } from "./types.js";

const generatedScreens = (tree: StaticNavigationTree, linking: StaticLinkingOptions): StaticPathConfig => {
    const initialRouteName = linking.config?.initialRouteName;
    const screens = createPathConfigForStaticNavigation(
        tree,
        initialRouteName !== undefined ? { initialRouteName } : undefined,
        linking.enabled === "auto",
    );

    if (screens === undefined) {
        throw new Error("Couldn't find any screens in the static configuration to generate a linking config from.");
    }

    return screens;
};

const staticLinkingConfig = (
    tree: StaticNavigationTree,
    linking: StaticLinkingOptions,
): LinkingConfig<ParamListBase> => {
    const { path, initialRouteName, screens } = linking.config ?? {};

    return {
        ...(path !== undefined && { path }),
        ...(initialRouteName !== undefined && { initialRouteName }),
        screens: { ...generatedScreens(tree, linking), ...screens },
    };
};

export const resolveStaticLinking = (
    tree: StaticNavigationTree,
    linking: StaticLinkingOptions | undefined,
): LinkingOptions<ParamListBase> | undefined => {
    if (linking === undefined) return undefined;

    const { enabled, config: _config, ...rest } = linking;

    return { ...rest, enabled: enabled !== false, config: staticLinkingConfig(tree, linking) };
};
