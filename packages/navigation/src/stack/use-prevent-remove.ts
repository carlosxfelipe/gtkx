import { usePreventRemoveContext } from "@react-navigation/core";

export const useRoutePrevented = (routeKey: string): boolean => {
    const { preventedRoutes } = usePreventRemoveContext();
    return preventedRoutes[routeKey]?.preventRemove ?? false;
};
