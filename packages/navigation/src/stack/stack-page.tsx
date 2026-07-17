import type * as Adw from "@gtkx/gi/adw";
import { AdwNavigationPage } from "@gtkx/jsx/adw";
import { createPortal, rootElement } from "@gtkx/react";
import { usePreventRemoveContext } from "@react-navigation/core";
import { type ReactNode, type RefCallback, useCallback, useContext } from "react";
import { PageRegistryContext } from "./page-registry.js";
import type { StackScreenOptions } from "./types.js";

type StackPageProps = {
    routeKey: string;
    routeName: string;
    options: StackScreenOptions;
    children: ReactNode;
};

export const StackPage = ({ routeKey, routeName, options, children }: StackPageProps): ReactNode => {
    const registry = useContext(PageRegistryContext);
    if (!registry) throw new Error("Stack pages must be rendered inside a stack navigator");

    const setPage = useCallback<RefCallback<Adw.NavigationPage>>(
        (page: Adw.NavigationPage) => {
            registry.register(routeKey, page);
            return () => registry.unregister(routeKey, page);
        },
        [registry, routeKey],
    );

    const { preventedRoutes } = usePreventRemoveContext();
    const preventRemove = preventedRoutes[routeKey]?.preventRemove ?? false;
    const canPop = preventRemove ? false : options.canPop;

    return createPortal(
        <AdwNavigationPage ref={setPage} tag={routeKey} title={options.title ?? routeName} canPop={canPop}>
            {children}
        </AdwNavigationPage>,
        rootElement,
    );
};
