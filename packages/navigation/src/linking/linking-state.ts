import {
    getActionFromState,
    getPathFromState,
    getStateFromPath,
    type NavigationContainerRef,
    type NavigationState,
    type ParamListBase,
    type PartialState,
} from "@react-navigation/core";
import type { RefObject } from "react";
import { resolvePrefixes } from "./default-prefix.js";
import { extractPathFromURL } from "./extract-path.js";
import type { LinkingOptions, LinkingPathState } from "./types.js";

export const stateFromPath = <ParamList extends ParamListBase>(
    path: string,
    options: LinkingOptions<ParamList>,
): PartialState<NavigationState> | undefined =>
    options.getStateFromPath ? options.getStateFromPath(path, options.config) : getStateFromPath(path, options.config);

export const stateFromURL = <ParamList extends ParamListBase>(
    url: string,
    options: LinkingOptions<ParamList>,
): PartialState<NavigationState> | undefined => {
    const path = extractPathFromURL(resolvePrefixes(options.prefixes), url);
    if (path === undefined) return undefined;
    return stateFromPath(path, options);
};

export const pathFromState = <ParamList extends ParamListBase>(
    state: LinkingPathState,
    options: LinkingOptions<ParamList>,
): string =>
    options.getPathFromState
        ? options.getPathFromState(state, options.config)
        : getPathFromState(state, options.config);

export const applyURLToRef = <ParamList extends ParamListBase>(
    ref: RefObject<NavigationContainerRef<ParamList> | null>,
    url: string,
    options: LinkingOptions<ParamList>,
): void => {
    const container = ref.current;
    if (!container) return;
    const state = stateFromURL(url, options);
    if (!state) return;
    const action = getActionFromState(state, options.config);
    if (action === undefined) container.resetRoot(state);
    else container.dispatch(action);
};
