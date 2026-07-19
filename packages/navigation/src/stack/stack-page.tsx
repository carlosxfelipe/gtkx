import type * as Adw from "@gtkx/gi/adw";
import { AdwNavigationPage } from "@gtkx/jsx/adw";
import { Activity, type ReactNode, useCallback, useRef } from "react";
import { installPageBackAction } from "./stack-back.js";
import type { PageTransitionHandlers } from "./stack-pages.js";
import type { StackScreenOptions } from "./types.js";

export type StackTransitionEmitter = (ending: boolean, closing: boolean) => void;

export type StackPageIdentity = {
    tag: string;
    focused: boolean;
    onTransition: StackTransitionEmitter;
    onBack: () => void;
};

type StackPageProps = {
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

const attachPage = (
    page: Adw.NavigationPage,
    emit: () => StackTransitionEmitter,
    back: () => () => void,
): (() => void) => {
    const releaseTransitions = connectTransitions(page, emit);
    const releaseAction = installPageBackAction(page, () => back()());
    return () => {
        releaseTransitions();
        releaseAction();
    };
};

const usePageRef = (
    emit: StackTransitionEmitter,
    onBack: () => void,
): ((page: Adw.NavigationPage | null) => (() => void) | undefined) => {
    const emitRef = useRef(emit);
    const backRef = useRef(onBack);
    emitRef.current = emit;
    backRef.current = onBack;

    return useCallback(
        (page: Adw.NavigationPage | null) =>
            page === null
                ? undefined
                : attachPage(
                      page,
                      () => emitRef.current,
                      () => backRef.current,
                  ),
        [],
    );
};

export const StackPage = ({ routeName, identity, options, handlers, children }: StackPageProps): ReactNode => {
    const pageRef = usePageRef(identity.onTransition, identity.onBack);

    return (
        <AdwNavigationPage
            ref={pageRef}
            tag={identity.tag}
            title={options.title ?? routeName}
            canPop={options.canPop}
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
