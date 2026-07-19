import { CommonActions, type ParamListBase, useNavigation } from "@react-navigation/core";
import { useMemo } from "react";
import type { ActivatableLinkProps, LinkTarget } from "./types.js";
import { useLinkBuilder } from "./use-link-builder.js";
import { useLinkTo } from "./use-link-to.js";

export type ResolvedLinkTarget<ParamList extends ParamListBase> = {
    screen: (keyof ParamList & string) | undefined;
    params: ParamList[keyof ParamList & string] | undefined;
    href: string | undefined;
};

export const useResolvedLinkProps = <ParamList extends ParamListBase>({
    screen,
    params,
    href,
}: ResolvedLinkTarget<ParamList>): ActivatableLinkProps => {
    const { buildHref } = useLinkBuilder<ParamList>();
    const linkTo = useLinkTo();
    const navigation = useNavigation();

    return useMemo<ActivatableLinkProps>(() => {
        if (screen === undefined) {
            return {
                href,
                onClicked: () => {
                    if (href !== undefined) linkTo(href);
                },
            };
        }
        return {
            href: buildHref(screen, params),
            onClicked: () => navigation.dispatch(CommonActions.navigate(screen, params)),
        };
    }, [screen, params, href, buildHref, linkTo, navigation]);
};

export const useLinkProps = <ParamList extends ParamListBase = ParamListBase>(
    target: LinkTarget<ParamList>,
): ActivatableLinkProps =>
    useResolvedLinkProps<ParamList>({ screen: target.screen, params: target.params, href: target.href });
