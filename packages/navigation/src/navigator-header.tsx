import * as Adw from "@gtkx/gi/adw";
import { AdwHeaderBar, AdwToolbarView, AdwWindowTitle } from "@gtkx/jsx/adw";
import type { ReactNode } from "react";

export type NavigatorHeaderOptions = {
    headerShown?: boolean;
    header?: ReactNode;
    headerTitle?: string;
    headerSubtitle?: string;
    headerLeft?: ReactNode;
    headerRight?: ReactNode;
    headerSearchBar?: ReactNode;
    headerTransparent?: boolean;
    headerShadowVisible?: boolean;
};

export type NavigationPageHeaderOptions = NavigatorHeaderOptions & {
    headerBackVisible?: boolean;
};

type NavigatorHeaderProps = {
    options: NavigationPageHeaderOptions;
    title: string;
    children: ReactNode;
};

const topBarStyleFor = (shadowVisible: boolean | undefined): Adw.ToolbarStyle | undefined => {
    if (shadowVisible === undefined) return undefined;
    return shadowVisible ? Adw.ToolbarStyle.RAISED : Adw.ToolbarStyle.FLAT;
};

const defaultHeaderBar = (options: NavigationPageHeaderOptions, title: string): ReactNode => (
    <AdwHeaderBar
        showBackButton={options.headerBackVisible}
        titleWidget={<AdwWindowTitle title={options.headerTitle ?? title} subtitle={options.headerSubtitle} />}
        start={options.headerLeft}
        end={options.headerRight}
    />
);

export const NavigatorHeader = ({ options, title, children }: NavigatorHeaderProps): ReactNode => {
    if (options.headerShown === false) return children;

    return (
        <AdwToolbarView
            topBarStyle={topBarStyleFor(options.headerShadowVisible)}
            extendContentToTopEdge={options.headerTransparent}
            topBar={
                <>
                    {options.header ?? defaultHeaderBar(options, title)}
                    {options.headerSearchBar}
                </>
            }
        >
            {children}
        </AdwToolbarView>
    );
};
