import {
    BaseNavigationContainer,
    type NavigationContainerProps as BaseNavigationContainerProps,
    type NavigationContainerRef,
    type ParamListBase,
} from "@react-navigation/core";
import type { ReactNode, Ref } from "react";

export type NavigationContainerProps = BaseNavigationContainerProps & {
    ref?: Ref<NavigationContainerRef<ParamListBase>>;
};

export const NavigationContainer = ({ ref, ...props }: NavigationContainerProps): ReactNode => (
    <BaseNavigationContainer ref={ref} {...props} />
);
