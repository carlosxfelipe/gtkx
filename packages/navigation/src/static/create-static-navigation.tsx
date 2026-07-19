import { createElement, type ReactNode, useMemo } from "react";
import { NavigationContainer } from "../navigation-container.js";
import { resolveStaticLinking } from "./static-linking.js";
import type { StaticNavigationProps, StaticNavigationTree } from "./types.js";

export const createStaticNavigation = (tree: StaticNavigationTree): ((props: StaticNavigationProps) => ReactNode) => {
    const Root = tree.getComponent();

    return ({ linking, ...props }: StaticNavigationProps): ReactNode => {
        const resolved = useMemo(() => resolveStaticLinking(tree, linking), [linking]);

        return (
            <NavigationContainer {...props} {...(resolved !== undefined && { linking: resolved })}>
                {createElement(Root)}
            </NavigationContainer>
        );
    };
};
