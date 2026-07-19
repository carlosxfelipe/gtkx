import type { NavigationContainerRef, ParamListBase } from "@react-navigation/core";
import { type RefObject, useMemo } from "react";
import { resolvePrefixes } from "./default-prefix.js";
import type { LinkWriter } from "./linking-context.js";
import { pathFromState, stateFromPath } from "./linking-state.js";
import type { LinkingOptions, LinkingResult } from "./types.js";
import { useDeliverArgvURIs } from "./use-deliver-argv-uris.js";
import { useInitialLinkingState } from "./use-initial-linking-state.js";
import { useURLSubscription } from "./use-url-subscription.js";

export type LinkingBinding = LinkingResult & { writer: LinkWriter | undefined };

export const useLinking = <ParamList extends ParamListBase>(
    ref: RefObject<NavigationContainerRef<ParamList> | null>,
    options: LinkingOptions<ParamList> | undefined,
): LinkingBinding => {
    const result = useInitialLinkingState(options);
    useURLSubscription(ref, options);
    useDeliverArgvURIs(options);

    const writer = useMemo<LinkWriter | undefined>(
        () =>
            options === undefined || options.enabled === false
                ? undefined
                : {
                      prefixes: resolvePrefixes(options.prefixes),
                      toPath: (state) => pathFromState(state, options),
                      toState: (path) => stateFromPath(path, options),
                  },
        [options],
    );

    return { ...result, writer };
};
