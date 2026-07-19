import type * as Adw from "@gtkx/gi/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import { createRef, type ReactNode, type RefObject } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
    createDrawerNavigator,
    createNavigationContainerRef,
    createTabNavigator,
    DrawerActions,
    type EventArg,
    getDrawerStatusFromState,
    NavigationContainer,
    useNavigation,
} from "../src/index.js";

type ShellParams = { Inbox: undefined; Tasks: undefined };
type DrawerParams = { Inbox: undefined; Archive: undefined };

declare module "../src/typing.js" {
    interface RootParamList extends ShellParams {}
    interface Theme {
        accentColor: string;
    }
}

const Tab = createTabNavigator<ShellParams>();
const Drawer = createDrawerNavigator<DrawerParams>();

const GlobalTypeProbe = (): ReactNode => {
    const navigation = useNavigation();
    const goToTasks = (): void => navigation.navigate("Tasks");
    return <GtkLabel>{goToTasks.name}</GtkLabel>;
};

const InboxScreen = (): ReactNode => <GtkLabel>Inbox Content</GtkLabel>;
const TasksScreen = (): ReactNode => <GtkLabel>Tasks Content</GtkLabel>;
const ArchiveScreen = (): ReactNode => <GtkLabel>Archive Content</GtkLabel>;

const requireStack = (ref: RefObject<Adw.ViewStack | null>): Adw.ViewStack => {
    const stack = ref.current;
    if (!stack) throw new Error("ViewStack ref was not populated");
    return stack;
};

const requireOverlay = (ref: RefObject<Adw.OverlaySplitView | null>): Adw.OverlaySplitView => {
    const view = ref.current;
    if (!view) throw new Error("OverlaySplitView ref was not populated");
    return view;
};

type TabPressListener = (event: EventArg<"tabPress", true, undefined>) => void;

const renderTabs = async (onTabPress: TabPressListener) => {
    const stackRef = createRef<Adw.ViewStack>();
    const navigationRef = createNavigationContainerRef<ShellParams>();

    await render(
        <NavigationContainer ref={navigationRef}>
            <Tab.Navigator ref={stackRef} screenListeners={{ tabPress: onTabPress }}>
                <Tab.Screen name="Inbox" component={InboxScreen} />
                <Tab.Screen name="Tasks" component={TasksScreen} />
            </Tab.Navigator>
        </NavigationContainer>,
    );

    const keyFor = (name: keyof ShellParams): string => {
        const route = navigationRef.getRootState().routes.find((candidate) => candidate.name === name);
        if (!route) throw new Error(`No route named ${String(name)}`);
        return route.key;
    };

    return { navigationRef, keyFor, stack: () => requireStack(stackRef) };
};

type DrawerToggleListener = (event: EventArg<"drawerToggle", true, { open: boolean }>) => void;

const renderDrawer = async (onDrawerToggle: DrawerToggleListener) => {
    const viewRef = createRef<Adw.OverlaySplitView>();
    const navigationRef = createNavigationContainerRef<DrawerParams>();

    await render(
        <NavigationContainer ref={navigationRef}>
            <Drawer.Navigator
                ref={viewRef}
                collapsed
                drawerContent={({ status }) => <GtkLabel>{`Drawer ${status}`}</GtkLabel>}
                screenListeners={{ drawerToggle: onDrawerToggle }}
            >
                <Drawer.Screen name="Inbox" component={InboxScreen} />
                <Drawer.Screen name="Archive" component={ArchiveScreen} />
            </Drawer.Navigator>
        </NavigationContainer>,
    );

    return { navigationRef, view: () => requireOverlay(viewRef) };
};

describe("tabPress", () => {
    it("emits for a widget-initiated switch and lets it through", async () => {
        const listener = vi.fn();
        const harness = await renderTabs(listener);
        await screen.findByText("Tasks Content");

        await act(() => {
            harness.stack().setVisibleChildName(harness.keyFor("Tasks"));
        });

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.calls[0]?.[0]).toMatchObject({ type: "tabPress", target: harness.keyFor("Tasks") });
        expect(harness.navigationRef.getRootState().index).toBe(1);
    });

    it("blocks the jump and restores the visible child when prevented", async () => {
        const harness = await renderTabs((event) => {
            event.preventDefault();
        });

        await act(() => {
            harness.stack().setVisibleChildName(harness.keyFor("Tasks"));
        });

        expect(harness.navigationRef.getRootState().index).toBe(0);
        expect(harness.stack().getVisibleChildName()).toBe(harness.keyFor("Inbox"));
    });

    it("does not emit for a React-initiated switch", async () => {
        const listener = vi.fn();
        const harness = await renderTabs(listener);

        await act(() => {
            harness.navigationRef.navigate("Tasks");
        });

        expect(listener).not.toHaveBeenCalled();
        expect(harness.navigationRef.getRootState().index).toBe(1);
    });
});

describe("drawerToggle", () => {
    it("emits with the requested state on a widget-initiated open", async () => {
        const listener = vi.fn();
        const harness = await renderDrawer(listener);

        await act(() => {
            harness.view().setShowSidebar(true);
        });

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.calls[0]?.[0]).toMatchObject({ type: "drawerToggle", data: { open: true } });
        expect(getDrawerStatusFromState(harness.navigationRef.getRootState())).toBe("open");
    });

    it("restores showSidebar when the open is prevented", async () => {
        const harness = await renderDrawer((event) => {
            event.preventDefault();
        });

        await act(() => {
            harness.view().setShowSidebar(true);
        });

        expect(harness.view().getShowSidebar()).toBe(false);
        expect(getDrawerStatusFromState(harness.navigationRef.getRootState())).toBe("closed");
    });

    it("restores showSidebar when the close is prevented", async () => {
        const listener = vi.fn<DrawerToggleListener>();
        const harness = await renderDrawer((event) => listener(event));
        await act(() => harness.navigationRef.dispatch(DrawerActions.openDrawer()));
        listener.mockImplementation((event) => {
            event.preventDefault();
        });

        await act(() => {
            harness.view().setShowSidebar(false);
        });

        expect(harness.view().getShowSidebar()).toBe(true);
        expect(getDrawerStatusFromState(harness.navigationRef.getRootState())).toBe("open");
    });

    it("does not emit for a dispatched drawer action", async () => {
        const listener = vi.fn();
        const harness = await renderDrawer(listener);

        await act(() => harness.navigationRef.dispatch(DrawerActions.openDrawer()));

        expect(listener).not.toHaveBeenCalled();
    });
});

describe("global type registration", () => {
    it("types useNavigation without a generic", () => {
        expectTypeOf<keyof ReactNavigation.RootParamList>().toEqualTypeOf<"Inbox" | "Tasks">();
        expectTypeOf<ReactNavigation.Theme["accentColor"]>().toEqualTypeOf<string>();
        expect(typeof GlobalTypeProbe).toBe("function");
    });
});
