import { getActionFromState, type ParamListBase, useStateForPath } from "@react-navigation/core";
import { use, useMemo } from "react";
import { LinkingOptionsContext } from "../linking/linking-context.js";
import { appendFocusedRoute, stateForHref } from "./link-state.js";
import type { LinkBuilder } from "./types.js";

export const useLinkBuilder = <ParamList extends ParamListBase = ParamListBase>(): LinkBuilder<ParamList> => {
    const writer = use(LinkingOptionsContext);
    const parent = useStateForPath();

    return useMemo<LinkBuilder<ParamList>>(
        () => ({
            buildHref: (name, params) =>
                writer ? writer.toPath(appendFocusedRoute<ParamList>(parent, name, params)) : undefined,
            buildAction: (href) => {
                const state = stateForHref(writer, href);
                return state === undefined ? undefined : getActionFromState(state);
            },
        }),
        [writer, parent],
    );
};
