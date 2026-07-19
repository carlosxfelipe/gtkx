import { getActionFromState, NavigationContainerRefContext, useNavigation } from "@react-navigation/core";
import { use, useCallback } from "react";
import { LinkingOptionsContext } from "../linking/linking-context.js";
import { stateForHref } from "./link-state.js";

export const useLinkTo = (): ((href: string) => void) => {
    const writer = use(LinkingOptionsContext);
    const container = use(NavigationContainerRefContext);
    const navigation = useNavigation();

    return useCallback(
        (href: string) => {
            const state = stateForHref(writer, href);
            if (state === undefined) return;
            const action = getActionFromState(state);
            if (action === undefined) container?.resetRoot(state);
            else navigation.dispatch(action);
        },
        [writer, container, navigation],
    );
};
