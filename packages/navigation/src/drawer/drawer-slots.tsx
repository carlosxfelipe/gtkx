import { AdwBin, AdwViewStack } from "@gtkx/jsx/adw";
import type { Route } from "@react-navigation/core";
import type { ReactElement, ReactNode } from "react";
import { renderViewStackPage } from "../view-stack-page.js";
import type { DrawerContentProps, DrawerDescriptor } from "./types.js";

type DrawerSlotsInput = DrawerContentProps & {
    render: (props: DrawerContentProps) => ReactNode;
    focusedKey: string;
};

const DrawerSidebar = (props: DrawerSlotsInput): ReactElement => {
    const { render, focusedKey: _focusedKey, ...content } = props;
    return <AdwBin>{render(content)}</AdwBin>;
};

const renderDrawerPage = (route: Route<string>, descriptor: DrawerDescriptor | undefined): ReactNode =>
    descriptor ? renderViewStackPage(route, descriptor.options, descriptor.render()) : null;

const DrawerViewStack = (props: DrawerSlotsInput): ReactElement => (
    <AdwViewStack visibleChildName={props.focusedKey}>
        {props.state.routes.map((route) => renderDrawerPage(route, props.descriptors[route.key]))}
    </AdwViewStack>
);

export const drawerSlots = (input: DrawerSlotsInput): { sidebar: ReactElement; content: ReactElement } => ({
    sidebar: <DrawerSidebar {...input} />,
    content: <DrawerViewStack {...input} />,
});
