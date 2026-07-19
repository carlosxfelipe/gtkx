import type * as Adw from "@gtkx/gi/adw";
import { AdwNavigationPage } from "@gtkx/jsx/adw";
import { Activity, type ReactNode, useCallback, useRef } from "react";
import type { PageTransitionHandlers } from "./stack-pages.js";
import type { StackScreenOptions } from "./types.js";
import { useRoutePrevented } from "./use-prevent-remove.js";

export type StackTransitionEmitter = (ending: boolean, closing: boolean) => void;

export type StackPageIdentity = { tag: string; focused: boolean; onTransition: StackTransitionEmitter };

type StackPageProps = {
    routeKey: string;
    routeName: string;
    identity: StackPageIdentity;
    options: StackScreenOptions;
    handlers: PageTransitionHandlers;
    children: ReactNode;
};

const connectTransitions = (page: Adw.NavigationPage, emit: () => StackTransitionEmitter): (() => void) => {
    const showing = (): void => emit()(false, false);
    const shown = (): void => emit()(true, false);
    const hiding = (): void => emit()(false, true);
    const hidden = (): void => emit()(true, true);

    page.on("showing", showing);
    page.on("shown", shown);
    page.on("hiding", hiding);
    page.on("hidden", hidden);

    return () => {
        page.off("showing", showing);
        page.off("shown", shown);
        page.off("hiding", hiding);
        page.off("hidden", hidden);
    };
};

const useTransitionRef = (
    emit: StackTransitionEmitter,
): ((page: Adw.NavigationPage | null) => (() => void) | undefined) => {
    const emitRef = useRef(emit);
    emitRef.current = emit;

    return useCallback(
        (page: Adw.NavigationPage | null) =>
            page === null ? undefined : connectTransitions(page, () => emitRef.current),
        [],
    );
};

export const StackPage = ({
    routeKey,
    routeName,
    identity,
    options,
    handlers,
    children,
}: StackPageProps): ReactNode => {
    const canPop = useRoutePrevented(routeKey) ? false : options.canPop;
    const transitionRef = useTransitionRef(identity.onTransition);

    return (
        <AdwNavigationPage
            ref={transitionRef}
            tag={identity.tag}
            title={options.title ?? routeName}
            canPop={canPop}
            onHiding={handlers.onHiding}
            onHidden={handlers.onHidden}
        >
            {options.freezeOnBlur ? (
                <Activity mode={identity.focused ? "visible" : "hidden"}>{children}</Activity>
            ) : (
                children
            )}
        </AdwNavigationPage>
    );
};
