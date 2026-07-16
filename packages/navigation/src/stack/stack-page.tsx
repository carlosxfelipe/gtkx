import type * as Adw from "@gtkx/gi/adw";
import { AdwNavigationPage } from "@gtkx/jsx/adw";
import { createPortal, rootElement } from "@gtkx/react";
import { usePreventRemoveContext } from "@react-navigation/core";
import { type ReactNode, type RefCallback, useCallback, useContext, useRef } from "react";
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

    const registryRef = useRef(registry);
    registryRef.current = registry;
    const keyRef = useRef(routeKey);
    keyRef.current = routeKey;
    const registeredRef = useRef<Adw.NavigationPage | null>(null);

    const setPage = useCallback<RefCallback<Adw.NavigationPage>>((page) => {
        const reg = registryRef.current;
        const previous = registeredRef.current;
        if (previous && previous !== page) {
            reg.unregister(keyRef.current, previous);
            registeredRef.current = null;
        }
        if (page) {
            reg.register(keyRef.current, page);
            registeredRef.current = page;
        }
    }, []);

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
