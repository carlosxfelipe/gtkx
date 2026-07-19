import type * as Adw from "@gtkx/gi/adw";
import { AdwNavigationPage } from "@gtkx/jsx/adw";
import { Activity, type ReactNode, useCallback, useRef } from "react";
import { NavigatorHeader } from "../navigator-header.js";
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

type TransitionProps = {
    onShowing: () => void;
    onShown: () => void;
    onHiding: () => void;
    onHidden: () => void;
};

const transitionProps = (emit: StackTransitionEmitter, handlers: PageTransitionHandlers): TransitionProps => ({
    onShowing: () => emit(false, false),
    onShown: () => emit(true, false),
    onHiding: () => {
        handlers.onHiding();
        emit(false, true);
    },
    onHidden: () => {
        handlers.onHidden();
        emit(true, true);
    },
});

const useBackRef = (onBack: () => void): ((page: Adw.NavigationPage | null) => (() => void) | undefined) => {
    const backRef = useRef(onBack);
    backRef.current = onBack;

    return useCallback(
        (page: Adw.NavigationPage | null) =>
            page === null ? undefined : installPageBackAction(page, () => backRef.current()),
        [],
    );
};

export const StackPage = ({ routeName, identity, options, handlers, children }: StackPageProps): ReactNode => {
    const pageRef = useBackRef(identity.onBack);
    const title = options.title ?? routeName;

    return (
        <AdwNavigationPage
            ref={pageRef}
            tag={identity.tag}
            title={title}
            canPop={options.canPop}
            {...transitionProps(identity.onTransition, handlers)}
        >
            <NavigatorHeader options={options} title={title}>
                {options.freezeOnBlur ? (
                    <Activity mode={identity.focused ? "visible" : "hidden"}>{children}</Activity>
                ) : (
                    children
                )}
            </NavigatorHeader>
        </AdwNavigationPage>
    );
};
