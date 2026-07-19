import { getStateFromPath, type NavigationState, type ParamListBase, type PartialState } from "@react-navigation/core";
import { extractPathFromURL } from "../linking/extract-path.js";
import type { LinkWriter } from "../linking/linking-context.js";
import type { LinkingPathState } from "../linking/types.js";

export const pathForHref = (prefixes: string[], href: string): string => {
    const extracted = extractPathFromURL(prefixes, href);
    if (extracted !== undefined) return extracted;
    return href.startsWith("/") ? href : `/${href}`;
};

export const stateForHref = (
    writer: LinkWriter | undefined,
    href: string,
): PartialState<NavigationState> | undefined => {
    const path = pathForHref(writer?.prefixes ?? [], href);
    return writer ? writer.toState(path) : getStateFromPath(path);
};

export const appendFocusedRoute = <ParamList extends ParamListBase>(
    parent: LinkingPathState | undefined,
    name: keyof ParamList & string,
    params: ParamList[keyof ParamList & string] | undefined,
): LinkingPathState => {
    const leaf: LinkingPathState = { routes: [{ name, ...(params !== undefined && { params }) }] };
    if (!parent) return leaf;
    const [route] = parent.routes;
    return { routes: [{ ...route, state: appendFocusedRoute(route.state, name, params) }] };
};
