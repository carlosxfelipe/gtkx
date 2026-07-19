import { AdwViewStackPage } from "@gtkx/jsx/adw";
import type { ReactNode } from "react";

export type ViewStackPageOptions = {
    title?: string;
    iconName?: string;
    badgeNumber?: number;
    needsAttention?: boolean;
};

export type ViewStackRoute = { key: string; name: string };

export const renderViewStackPage = (
    route: ViewStackRoute,
    options: ViewStackPageOptions,
    children: ReactNode,
): ReactNode => (
    <AdwViewStackPage
        key={route.key}
        name={route.key}
        title={options.title ?? route.name}
        iconName={options.iconName}
        badgeNumber={options.badgeNumber}
        needsAttention={options.needsAttention}
    >
        {children}
    </AdwViewStackPage>
);
