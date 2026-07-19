import { type ParamListBase, validatePathConfig } from "@react-navigation/core";
import { useEffect, useState } from "react";
import { resolvePrefixes } from "./default-prefix.js";
import { getInitialURLFromArgv } from "./initial-url.js";
import { stateFromURL } from "./linking-state.js";
import type { LinkingOptions, LinkingResult } from "./types.js";

const READY: LinkingResult = { isReady: true, initialState: undefined };

const isThenable = (value: unknown): value is Promise<string | undefined> =>
    typeof value === "object" && value !== null && "then" in value;

const resolveInitial = <ParamList extends ParamListBase>(
    options: LinkingOptions<ParamList> | undefined,
): LinkingResult | Promise<string | undefined> => {
    if (options === undefined || options.enabled === false) return READY;
    if (options.config) validatePathConfig(options.config);
    const url = options.getInitialURL
        ? options.getInitialURL()
        : getInitialURLFromArgv(resolvePrefixes(options.prefixes));
    if (isThenable(url)) return url;
    return { isReady: true, initialState: url === undefined ? undefined : stateFromURL(url, options) };
};

export const useInitialLinkingState = <ParamList extends ParamListBase>(
    options: LinkingOptions<ParamList> | undefined,
): LinkingResult => {
    const [pending] = useState(() => resolveInitial(options));
    const [resolved, setResolved] = useState<LinkingResult | null>(null);

    useEffect(() => {
        if (!isThenable(pending)) return;
        let active = true;
        pending.then((url) => {
            if (!active) return;
            const initialState = url === undefined || !options ? undefined : stateFromURL(url, options);
            setResolved({ isReady: true, initialState });
        });
        return () => {
            active = false;
        };
    }, [pending, options]);

    if (!isThenable(pending)) return pending;
    return resolved ?? { isReady: false, initialState: undefined };
};
