import { useStateForPath } from "@react-navigation/core";
import { use } from "react";
import { LinkingOptionsContext } from "./linking-context.js";

export const useLinkPath = (): string | undefined => {
    const writer = use(LinkingOptionsContext);
    const state = useStateForPath();
    if (!writer || !state) return undefined;
    return writer.toPath(state);
};

export const useLinkURL = (): string | undefined => {
    const path = useLinkPath();
    const writer = use(LinkingOptionsContext);
    const [prefix] = writer?.prefixes ?? [];
    if (path === undefined || prefix === undefined) return undefined;
    return `${prefix.replace(/\/$/, "")}${path}`;
};
