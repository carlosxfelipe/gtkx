import type { NavigationState, PartialState } from "@react-navigation/core";
import { type Context, createContext } from "react";
import type { LinkingPathState } from "./types.js";

export type LinkWriter = {
    prefixes: string[];
    toPath: (state: LinkingPathState) => string;
    toState: (path: string) => PartialState<NavigationState> | undefined;
};

export const LinkingOptionsContext: Context<LinkWriter | undefined> = createContext<LinkWriter | undefined>(undefined);
