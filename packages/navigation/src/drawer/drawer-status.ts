import { type ParamListBase, useNavigationState } from "@react-navigation/core";
import type { DrawerStatus } from "@react-navigation/routers";

export type DrawerStatusState = {
    default?: DrawerStatus;
    history?: unknown[];
};

const isDrawerEntry = (entry: unknown): boolean =>
    typeof entry === "object" && entry !== null && "type" in entry && entry.type === "drawer";

export const getDrawerStatusFromState = (state: DrawerStatusState): DrawerStatus => {
    const fallback = state.default ?? "closed";
    const flipped = state.history?.some(isDrawerEntry) ?? false;
    if (!flipped) return fallback;
    return fallback === "open" ? "closed" : "open";
};

export const useDrawerStatus = (): DrawerStatus =>
    useNavigationState<ParamListBase, DrawerStatus>(getDrawerStatusFromState);
