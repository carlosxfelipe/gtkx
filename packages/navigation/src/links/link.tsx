import type { WidgetProps } from "@gtkx/components";
import { GtkButton } from "@gtkx/jsx/gtk";
import type { ParamListBase } from "@react-navigation/core";
import type { ElementType, ReactNode } from "react";
import type { LinkTarget } from "./types.js";
import { useResolvedLinkProps } from "./use-link-props.js";

export type LinkProps<
    C extends ElementType = typeof GtkButton,
    ParamList extends ParamListBase = ParamListBase,
> = WidgetProps<C, LinkTarget<ParamList>, "onClicked">;

export const Link = <C extends ElementType = typeof GtkButton, ParamList extends ParamListBase = ParamListBase>({
    component,
    screen,
    params,
    href,
    ...rest
}: LinkProps<C, ParamList>): ReactNode => {
    const Component: ElementType = component ?? GtkButton;
    const { onClicked } = useResolvedLinkProps<ParamList>({ screen, params, href });

    return <Component {...rest} onClicked={onClicked} />;
};
