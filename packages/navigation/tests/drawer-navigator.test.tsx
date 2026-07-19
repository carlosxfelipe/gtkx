import * as Adw from "@gtkx/gi/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import { createRef, type ReactNode, type RefObject } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    createDrawerNavigator,
    createNavigationContainerRef,
    DrawerActions,
    getDrawerStatusFromState,
    NavigationContainer,
    type NavigationState,
} from "../src/index.js";

type DrawerParams = { Inbox: undefined; Archive: undefined };
const Drawer = createDrawerNavigator<DrawerParams>();
const InboxScreen = (): ReactNode => <GtkLabel>Inbox Content</GtkLabel>;
const ArchiveScreen = (): ReactNode => <GtkLabel>Archive Content</GtkLabel>;

const requireOverlay = (ref: RefObject<Adw.OverlaySplitView | null>): Adw.OverlaySplitView => {
    const view = ref.current;
    if (!view) throw new Error("no ref");
    return view;
};

const renderDrawer = async (
    options: { collapsed?: boolean; onStateChange?: (s: NavigationState | undefined) => void } = {},
) => {
    const viewRef = createRef<Adw.OverlaySplitView>();
    const navigationRef = createNavigationContainerRef<DrawerParams>();
    await render(
        <NavigationContainer
            ref={navigationRef}
            {...(options.onStateChange !== undefined && { onStateChange: options.onStateChange })}
        >
            <Drawer.Navigator
                ref={viewRef}
                drawerContent={({ status }) => <GtkLabel>{`Drawer ${status}`}</GtkLabel>}
                {...(options.collapsed !== undefined && { collapsed: options.collapsed })}
            >
                <Drawer.Screen name="Inbox" component={InboxScreen} />
                <Drawer.Screen name="Archive" component={ArchiveScreen} />
            </Drawer.Navigator>
        </NavigationContainer>,
    );
    return { viewRef, navigationRef, view: () => requireOverlay(viewRef) };
};

const snap = (h: Awaited<ReturnType<typeof renderDrawer>>) => ({
    show: h.view().getShowSidebar(),
    status: getDrawerStatusFromState(h.navigationRef.getRootState()),
    index: h.navigationRef.getRootState().index,
});

describe("drawer corrected", () => {
    it("uncollapsed sidebar stays visible across navigation", async () => {
        const h = await renderDrawer();
        await screen.findByText("Inbox Content");
        expect(snap(h)).toEqual({ show: true, status: "closed", index: 0 });
        await act(() => h.navigationRef.navigate("Archive"));
        await screen.findByText("Archive Content");
        expect(snap(h)).toEqual({ show: true, status: "closed", index: 1 });
        const content = h.view().getContent();
        expect(content).toBeInstanceOf(Adw.ViewStack);
        if (content instanceof Adw.ViewStack)
            expect(content.getVisibleChildName()).toBe(h.navigationRef.getRootState().routes[1]?.key);
    });

    it("collapsed drawer opens, closes on navigate, no echo", async () => {
        const onStateChange = vi.fn();
        const h = await renderDrawer({ collapsed: true, onStateChange });
        expect(snap(h)).toEqual({ show: false, status: "closed", index: 0 });
        onStateChange.mockClear();
        await act(() => h.navigationRef.dispatch(DrawerActions.openDrawer()));
        expect(snap(h)).toEqual({ show: true, status: "open", index: 0 });
        expect(onStateChange).toHaveBeenCalledTimes(1);
        onStateChange.mockClear();
        await act(() => h.navigationRef.navigate("Archive"));
        expect(snap(h)).toEqual({ show: false, status: "closed", index: 1 });
        expect(onStateChange).toHaveBeenCalledTimes(1);
    });

    it("widget-initiated close dispatches once", async () => {
        const onStateChange = vi.fn();
        const h = await renderDrawer({ collapsed: true, onStateChange });
        await act(() => h.navigationRef.dispatch(DrawerActions.openDrawer()));
        onStateChange.mockClear();
        await act(() => h.view().setShowSidebar(false));
        expect(snap(h)).toEqual({ show: false, status: "closed", index: 0 });
        expect(onStateChange).toHaveBeenCalledTimes(1);
    });

    it("collapse round trip never dispatches", async () => {
        const onStateChange = vi.fn();
        const h = await renderDrawer({ onStateChange });
        onStateChange.mockClear();
        await act(() => h.view().setCollapsed(true));
        expect(snap(h)).toEqual({ show: false, status: "closed", index: 0 });
        await act(() => h.view().setCollapsed(false));
        expect(snap(h)).toEqual({ show: true, status: "closed", index: 0 });
        expect(onStateChange).not.toHaveBeenCalled();
    });

    it("goBack pops the drawer entry before the route", async () => {
        const h = await renderDrawer({ collapsed: true });
        await act(() => h.navigationRef.navigate("Archive"));
        await act(() => h.navigationRef.dispatch(DrawerActions.openDrawer()));
        expect(snap(h)).toEqual({ show: true, status: "open", index: 1 });
        await act(() => h.navigationRef.goBack());
        expect(snap(h)).toEqual({ show: false, status: "closed", index: 1 });
        await act(() => h.navigationRef.goBack());
        expect(snap(h).index).toBe(0);
    });
});
