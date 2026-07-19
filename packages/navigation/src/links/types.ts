import type { NavigationAction, ParamListBase } from "@react-navigation/core";

export type ScreenLinkTarget<ParamList extends ParamListBase = ParamListBase> = {
    [Name in keyof ParamList & string]: { screen: Name; params?: ParamList[Name]; href?: never };
}[keyof ParamList & string];

export type HrefLinkTarget = { href: string; screen?: never; params?: never };

export type LinkTarget<ParamList extends ParamListBase = ParamListBase> = ScreenLinkTarget<ParamList> | HrefLinkTarget;

export type ActivatableLinkProps = { href: string | undefined; onClicked: () => void };

export type LinkBuilder<ParamList extends ParamListBase = ParamListBase> = {
    buildHref: <Name extends keyof ParamList & string>(name: Name, params?: ParamList[Name]) => string | undefined;
    buildAction: (href: string) => NavigationAction | undefined;
};
