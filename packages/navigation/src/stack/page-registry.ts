import type * as Adw from "@gtkx/gi/adw";
import { createContext, useMemo, useRef } from "react";

export type PageRegistry = {
    register(key: string, page: Adw.NavigationPage): void;
    unregister(key: string, page: Adw.NavigationPage): void;
    get(key: string): Adw.NavigationPage | undefined;
};

export const PageRegistryContext: React.Context<PageRegistry | null> = createContext<PageRegistry | null>(null);

export const usePageRegistry = (): PageRegistry => {
    const pagesRef = useRef<Map<string, Adw.NavigationPage>>(new Map());
    return useMemo<PageRegistry>(
        () => ({
            register: (key, page) => {
                pagesRef.current.set(key, page);
            },
            unregister: (key, page) => {
                if (pagesRef.current.get(key) === page) pagesRef.current.delete(key);
            },
            get: (key) => pagesRef.current.get(key),
        }),
        [],
    );
};
