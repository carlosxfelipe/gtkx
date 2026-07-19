import * as Adw from "@gtkx/gi/adw";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { render, screen } from "@gtkx/testing";
import { createRef, type ReactNode, type RefObject } from "react";
import { describe, expect, it } from "vitest";
import {
    createDrawerNavigator,
    createNavigationContainerRef,
    createSplitViewNavigator,
    createStackNavigator,
    NavigationContainer,
    type StackScreenOptions,
} from "../src/index.js";
import { requireView } from "./fixtures.js";

type HeaderParams = { Inbox: undefined; Message: undefined };

const HeaderStack = createStackNavigator<HeaderParams>();

const InboxScreen = (): ReactNode => <GtkLabel>Inbox Content</GtkLabel>;
const MessageScreen = (): ReactNode => <GtkLabel>Message Content</GtkLabel>;

const DEEP_STATE = { index: 1, routes: [{ name: "Inbox" }, { name: "Message" }] };

type HeaderRenderOptions = { options?: StackScreenOptions; deep?: boolean };

const renderHeaderScreen = async (input: HeaderRenderOptions = {}): Promise<Adw.NavigationPage> => {
    const viewRef: RefObject<Adw.NavigationView | null> = createRef<Adw.NavigationView>();
    const navigationRef = createNavigationContainerRef<HeaderParams>();
    const screenName = input.deep ? "Message" : "Inbox";

    await render(
        <NavigationContainer ref={navigationRef} {...(input.deep === true && { initialState: DEEP_STATE })}>
            <HeaderStack.Navigator ref={viewRef}>
                <HeaderStack.Screen name="Inbox" component={InboxScreen} />
                <HeaderStack.Screen
                    name="Message"
                    component={MessageScreen}
                    {...(input.options !== undefined && { options: input.options })}
                />
            </HeaderStack.Navigator>
        </NavigationContainer>,
    );

    await screen.findByText(`${screenName} Content`);
    const page = requireView(viewRef).getVisiblePage();
    if (!page) throw new Error("NavigationView has no visible page");
    return page;
};

const descendants = function* (widget: Gtk.Widget): Generator<Gtk.Widget> {
    yield widget;
    for (let child = widget.getFirstChild(); child; child = child.getNextSibling()) yield* descendants(child);
};

const allOf = <T extends Gtk.Widget>(root: Gtk.Widget, type: new (...args: never[]) => T): T[] =>
    [...descendants(root)].filter((widget): widget is T => widget instanceof type);

const onlyOf = <T extends Gtk.Widget>(root: Gtk.Widget, type: new (...args: never[]) => T): T => {
    const found = allOf(root, type);
    const first = found[0];
    if (found.length !== 1 || first === undefined) throw new Error(`Expected exactly one match, found ${found.length}`);
    return first;
};

const isInside = (widget: Gtk.Widget | null, ancestor: Gtk.Widget | null): boolean => {
    if (ancestor === null) return false;
    for (let node = widget; node; node = node.getParent()) {
        if (node === ancestor) return true;
    }
    return false;
};

const packSideOf = (headerBar: Adw.HeaderBar, widget: Gtk.Widget): "start" | "end" | null => {
    const centerBox = onlyOf(headerBar, Gtk.CenterBox);
    if (isInside(widget, centerBox.getStartWidget())) return "start";
    if (isInside(widget, centerBox.getEndWidget())) return "end";
    return null;
};

const labelledButton = (root: Gtk.Widget, label: string): Gtk.Button => {
    const found = allOf(root, Gtk.Button).filter((button) => button.getLabel() === label);
    const first = found[0];
    if (first === undefined) throw new Error(`No button labelled ${label}`);
    return first;
};

describe("navigator header - headerShown", () => {
    it("wraps the screen in a header by default", async () => {
        const page = await renderHeaderScreen();

        expect(allOf(page, Adw.ToolbarView)).toHaveLength(1);
        expect(allOf(page, Adw.HeaderBar)).toHaveLength(1);
        await screen.findByText("Inbox Content");
    });

    it("renders no toolbar view when headerShown is false", async () => {
        const page = await renderHeaderScreen({ deep: true, options: { headerShown: false } });

        expect(allOf(page, Adw.ToolbarView)).toHaveLength(0);
        expect(allOf(page, Adw.HeaderBar)).toHaveLength(0);
        await screen.findByText("Message Content");
    });
});

describe("navigator header - title", () => {
    it("falls back to the route name", async () => {
        const page = await renderHeaderScreen({ deep: true });

        const windowTitle = onlyOf(page, Adw.WindowTitle);
        expect(windowTitle.getTitle()).toBe("Message");
        expect(windowTitle.getSubtitle()).toBe("");
    });

    it("prefers the title option over the route name", async () => {
        const page = await renderHeaderScreen({ deep: true, options: { title: "Thread" } });

        expect(onlyOf(page, Adw.WindowTitle).getTitle()).toBe("Thread");
    });

    it("lets headerTitle override the title option and carries a subtitle", async () => {
        const page = await renderHeaderScreen({
            deep: true,
            options: { title: "Thread", headerTitle: "Unread", headerSubtitle: "3 messages" },
        });

        const windowTitle = onlyOf(page, Adw.WindowTitle);
        expect(windowTitle.getTitle()).toBe("Unread");
        expect(windowTitle.getSubtitle()).toBe("3 messages");
        expect(page.getTitle()).toBe("Thread");
    });
});

describe("navigator header - packed children", () => {
    it("packs headerLeft at the start and headerRight at the end", async () => {
        const page = await renderHeaderScreen({
            deep: true,
            options: { headerLeft: <GtkButton label="Archive" />, headerRight: <GtkButton label="Compose" /> },
        });

        const headerBar = onlyOf(page, Adw.HeaderBar);
        expect(packSideOf(headerBar, labelledButton(headerBar, "Archive"))).toBe("start");
        expect(packSideOf(headerBar, labelledButton(headerBar, "Compose"))).toBe("end");
    });

    it("renders headerSearchBar as a second top bar next to the header bar", async () => {
        const page = await renderHeaderScreen({
            deep: true,
            options: { headerSearchBar: <GtkLabel>Search Field</GtkLabel> },
        });

        const headerBar = onlyOf(page, Adw.HeaderBar);
        const searchBar = await screen.findByText("Search Field");

        expect(isInside(searchBar, headerBar)).toBe(false);
        expect(searchBar.getParent()).toBe(headerBar.getParent());
        expect(headerBar.getNextSibling()).toBe(searchBar);
    });
});

describe("navigator header - back button", () => {
    const backButtons = (page: Adw.NavigationPage): Gtk.Widget[] =>
        [...descendants(page)].filter((widget) => widget.getName() === "AdwBackButton");

    it("shows the back button on a page that can pop", async () => {
        const page = await renderHeaderScreen({ deep: true });

        expect(page.getCanPop()).toBe(true);
        expect(onlyOf(page, Adw.HeaderBar).getShowBackButton()).toBe(true);
        expect(backButtons(page)).toHaveLength(1);
        expect(backButtons(page)[0]?.getVisible()).toBe(true);
    });

    it("hides the back button when headerBackVisible is false while canPop stays true", async () => {
        const page = await renderHeaderScreen({ deep: true, options: { headerBackVisible: false } });

        expect(page.getCanPop()).toBe(true);
        expect(onlyOf(page, Adw.HeaderBar).getShowBackButton()).toBe(false);
        expect(backButtons(page)).toHaveLength(0);
    });
});

type ShellParams = { Sidebar: undefined; Tasks: undefined };

const Split = createSplitViewNavigator<ShellParams>();

const SidebarScreen = (): ReactNode => <GtkLabel>Sidebar Content</GtkLabel>;
const TasksScreen = (): ReactNode => <GtkLabel>Tasks Content</GtkLabel>;

describe("navigator header - split view", () => {
    const renderSplit = async (): Promise<Adw.NavigationSplitView> => {
        const viewRef = createRef<Adw.NavigationSplitView>();

        await render(
            <NavigationContainer>
                <Split.Navigator ref={viewRef}>
                    <Split.Screen
                        name="Sidebar"
                        component={SidebarScreen}
                        options={{ headerRight: <GtkButton label="New" /> }}
                    />
                    <Split.Screen name="Tasks" component={TasksScreen} options={{ headerShown: false }} />
                </Split.Navigator>
            </NavigationContainer>,
        );

        await screen.findByText("Sidebar Content");
        const view = viewRef.current;
        if (!view) throw new Error("NavigationSplitView ref was not populated");
        return view;
    };

    it("gives each pane its own header and honors headerShown per pane", async () => {
        const view = await renderSplit();
        const sidebar = view.getSidebar();
        const content = view.getContent();
        if (!sidebar || !content) throw new Error("The split view is missing a pane");

        const sidebarHeader = onlyOf(sidebar, Adw.HeaderBar);
        expect(onlyOf(sidebar, Adw.WindowTitle).getTitle()).toBe("Sidebar");
        expect(packSideOf(sidebarHeader, labelledButton(sidebarHeader, "New"))).toBe("end");
        expect(allOf(content, Adw.ToolbarView)).toHaveLength(0);
    });
});

type MailParams = { Inbox: undefined };

const Drawer = createDrawerNavigator<MailParams>();

describe("navigator header - drawer", () => {
    it("gives each drawer page its own header titled by the route name", async () => {
        const viewRef = createRef<Adw.OverlaySplitView>();

        await render(
            <NavigationContainer>
                <Drawer.Navigator ref={viewRef} drawerContent={() => <GtkLabel>Drawer Content</GtkLabel>}>
                    <Drawer.Screen name="Inbox" component={InboxScreen} />
                </Drawer.Navigator>
            </NavigationContainer>,
        );

        await screen.findByText("Inbox Content");
        const content = viewRef.current?.getContent();
        if (!content) throw new Error("The drawer has no content pane");

        expect(allOf(content, Adw.ToolbarView)).toHaveLength(1);
        expect(onlyOf(content, Adw.WindowTitle).getTitle()).toBe("Inbox");
    });
});
