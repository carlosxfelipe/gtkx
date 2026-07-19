import { useMergeRefs } from "@gtkx/react/internal";
import {
    BaseNavigationContainer,
    type NavigationContainerProps as BaseNavigationContainerProps,
    type NavigationContainerRef,
    type ParamListBase,
    useNavigationContainerRef,
} from "@react-navigation/core";
import type { ReactNode, Ref } from "react";
import { LinkingOptionsContext } from "./linking/linking-context.js";
import type { LinkingOptions } from "./linking/types.js";
import { useLinking } from "./linking/use-linking.js";

export type NavigationContainerProps<ParamList extends ParamListBase = ParamListBase> = BaseNavigationContainerProps & {
    ref?: Ref<NavigationContainerRef<ParamList>>;
    linking?: LinkingOptions<ParamList>;
    fallback?: ReactNode;
};

export const NavigationContainer = <ParamList extends ParamListBase = ParamListBase>({
    ref,
    linking,
    fallback,
    ...props
}: NavigationContainerProps<ParamList>): ReactNode => {
    const containerRef = useNavigationContainerRef<ParamList>();
    const setRef = useMergeRefs<NavigationContainerRef<ParamList>>(containerRef, ref);
    const { isReady, initialState, writer } = useLinking(containerRef, linking);

    if (!isReady) return fallback ?? null;

    const resolvedState = props.initialState ?? initialState;

    return (
        <LinkingOptionsContext.Provider value={writer}>
            <BaseNavigationContainer
                ref={setRef}
                {...props}
                {...(resolvedState !== undefined && { initialState: resolvedState })}
            />
        </LinkingOptionsContext.Provider>
    );
};
