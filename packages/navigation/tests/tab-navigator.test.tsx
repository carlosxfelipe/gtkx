import type * as Adw from "@gtkx/gi/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import { createRef, type ReactNode, type RefObject } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    createNavigationContainerRef,
    createTabNavigator,
    NavigationContainer,
    type NavigationContainerRefWithCurrent,
    type NavigationState,
    type NavigatorScreenParams,
    TabActions,
    type TabBackBehavior,
    type TabScreenOptions,
} from "../src/index.js";
import { ListScreen, liveTags, requireView, Stack, TaskScreen, type TasksParams } from "./fixtures.js";

type ShellParams = {
    Inbox: undefined;
    Tasks: NavigatorScreenParams<TasksParams> | undefined;
    Settings: undefined;
};

const requireStack = (ref: RefObject<Adw.ViewStack | null>): Adw.ViewStack => {
    const stack = ref.current;
    if (!stack) throw new Error("ViewStack ref was not populated");
    return stack;
};

const pageFor = (stack: Adw.ViewStack, key: string): Adw.ViewStackPage => {
    const child = stack.getChildByName(key);
    if (!child) throw new Error(`No child named ${key}`);
    return stack.getPage(child);
};

const InboxScreen = (): ReactNode => <GtkLabel>Inbox Content</GtkLabel>;
const TasksScreen = (): ReactNode => <GtkLabel>Tasks Content</GtkLabel>;
const SettingsScreen = (): ReactNode => <GtkLabel>Settings Content</GtkLabel>;

const Tab = createTabNavigator<ShellParams>();

type TabHarness = {
    stackRef: RefObject<Adw.ViewStack | null>;
    navigationRef: NavigationContainerRefWithCurrent<ShellParams>;
    stack: () => Adw.ViewStack;
    keyFor: (name: keyof ShellParams) => string;
};

const renderTabs = async (
    options: {
        initialRouteName?: keyof ShellParams;
        backBehavior?: TabBackBehavior;
        onStateChange?: (state: NavigationState | undefined) => void;
        tasksComponent?: () => ReactNode;
        inboxOptions?: TabScreenOptions;
        tasksOptions?: TabScreenOptions;
    } = {},
): Promise<TabHarness> => {
    const stackRef = createRef<Adw.ViewStack>();
    const navigationRef = createNavigationContainerRef<ShellParams>();

    await render(
        <NavigationContainer
            ref={navigationRef}
            {...(options.onStateChange !== undefined && { onStateChange: options.onStateChange })}
        >
            <Tab.Navigator
                ref={stackRef}
                {...(options.initialRouteName !== undefined && { initialRouteName: options.initialRouteName })}
                {...(options.backBehavior !== undefined && { backBehavior: options.backBehavior })}
            >
                <Tab.Screen
                    name="Inbox"
                    component={InboxScreen}
                    {...(options.inboxOptions !== undefined && { options: options.inboxOptions })}
                />
                <Tab.Screen
                    name="Tasks"
                    component={options.tasksComponent ?? TasksScreen}
                    {...(options.tasksOptions !== undefined && { options: options.tasksOptions })}
                />
                <Tab.Screen name="Settings" component={SettingsScreen} />
            </Tab.Navigator>
        </NavigationContainer>,
    );

    const keyFor = (name: keyof ShellParams): string => {
        const route = navigationRef.getRootState().routes.find((candidate) => candidate.name === name);
        if (!route) throw new Error(`No route named ${String(name)}`);
        return route.key;
    };

    return { stackRef, navigationRef, stack: () => requireStack(stackRef), keyFor };
};

describe("tab navigator", () => {
    it("renders every screen at once and applies page options", async () => {
        const harness = await renderTabs({
            inboxOptions: { title: "Inbox", iconName: "mail-symbolic", badgeNumber: 3, needsAttention: true },
        });

        await screen.findByText("Inbox Content");
        await screen.findByText("Tasks Content");
        await screen.findByText("Settings Content");

        const inboxPage = pageFor(harness.stack(), harness.keyFor("Inbox"));
        expect(inboxPage.getTitle()).toBe("Inbox");
        expect(inboxPage.getIconName()).toBe("mail-symbolic");
        expect(inboxPage.getBadgeNumber()).toBe(3);
        expect(inboxPage.getNeedsAttention()).toBe(true);

        const tasksPage = pageFor(harness.stack(), harness.keyFor("Tasks"));
        expect(tasksPage.getTitle()).toBe("Tasks");
        expect(tasksPage.getBadgeNumber()).toBe(0);
        expect(tasksPage.getNeedsAttention()).toBe(false);
    });

    it("starts on the first route", async () => {
        const harness = await renderTabs();

        expect(harness.stack().getVisibleChildName()).toBe(harness.keyFor("Inbox"));
        expect(harness.navigationRef.getRootState().index).toBe(0);
    });

    it("honors initialRouteName even when that page is added last", async () => {
        const harness = await renderTabs({ initialRouteName: "Settings" });

        expect(harness.stack().getVisibleChildName()).toBe(harness.keyFor("Settings"));
        expect(harness.navigationRef.getRootState().index).toBe(2);
    });

    it("moves the visible child and the state index together on navigate", async () => {
        const harness = await renderTabs();

        await act(() => {
            harness.navigationRef.navigate("Tasks");
        });

        expect(harness.stack().getVisibleChildName()).toBe(harness.keyFor("Tasks"));
        expect(harness.navigationRef.getRootState().index).toBe(1);
    });

    it("switches on TabActions.jumpTo without unmounting the other screens", async () => {
        const harness = await renderTabs();

        await act(() => {
            harness.navigationRef.dispatch(TabActions.jumpTo("Settings"));
        });

        expect(harness.stack().getVisibleChildName()).toBe(harness.keyFor("Settings"));
        await screen.findByText("Inbox Content");
        await screen.findByText("Tasks Content");
        await screen.findByText("Settings Content");
    });

    it("dispatches once on a widget-initiated switch without echoing", async () => {
        const onStateChange = vi.fn();
        const harness = await renderTabs({ onStateChange });

        await act(() => {
            harness.navigationRef.navigate("Tasks");
        });
        onStateChange.mockClear();

        await act(() => {
            harness.stack().setVisibleChildName(harness.keyFor("Inbox"));
        });

        expect(harness.navigationRef.getRootState().index).toBe(0);
        expect(harness.stack().getVisibleChildName()).toBe(harness.keyFor("Inbox"));
        expect(onStateChange).toHaveBeenCalledTimes(1);
    });

    it("dispatches once on a React-initiated switch", async () => {
        const onStateChange = vi.fn();
        const harness = await renderTabs({ onStateChange });
        onStateChange.mockClear();

        await act(() => {
            harness.navigationRef.navigate("Settings");
        });

        expect(onStateChange).toHaveBeenCalledTimes(1);
    });

    it("goes back to the first route with the default back behavior", async () => {
        const harness = await renderTabs();

        await act(() => {
            harness.navigationRef.navigate("Settings");
        });
        expect(harness.navigationRef.getRootState().index).toBe(2);

        await act(() => {
            harness.navigationRef.goBack();
        });

        expect(harness.navigationRef.getRootState().index).toBe(0);
        expect(harness.stack().getVisibleChildName()).toBe(harness.keyFor("Inbox"));
    });

    it("goes back through the visit history with backBehavior history", async () => {
        const harness = await renderTabs({ backBehavior: "history" });

        await act(() => {
            harness.navigationRef.navigate("Tasks");
        });
        await act(() => {
            harness.navigationRef.navigate("Settings");
        });

        await act(() => {
            harness.navigationRef.goBack();
        });

        expect(harness.navigationRef.getRootState().index).toBe(1);
        expect(harness.stack().getVisibleChildName()).toBe(harness.keyFor("Tasks"));
    });

    it("does not move the index on goBack with backBehavior none", async () => {
        const harness = await renderTabs({ backBehavior: "none" });

        await act(() => {
            harness.navigationRef.navigate("Settings");
        });

        await act(() => {
            harness.navigationRef.goBack();
        });

        expect(harness.navigationRef.getRootState().index).toBe(2);
        expect(harness.stack().getVisibleChildName()).toBe(harness.keyFor("Settings"));
    });

    it("hosts a nested stack navigator as a tab screen", async () => {
        const stackViewRef = createRef<Adw.NavigationView>();

        const TasksStack = (): ReactNode => (
            <Stack.Navigator ref={stackViewRef} popOnEscape={false}>
                <Stack.Screen name="List" component={ListScreen} options={{ title: "Tasks" }} />
                <Stack.Screen name="Task" component={TaskScreen} />
            </Stack.Navigator>
        );

        const harness = await renderTabs({ tasksComponent: TasksStack });

        await screen.findByText("List Content");

        await act(() => {
            harness.navigationRef.navigate("Tasks", { screen: "Task", params: { id: "9" } });
        });

        await screen.findByText("Task 9");
        expect(liveTags(requireView(stackViewRef))).toHaveLength(2);

        await act(() => {
            requireView(stackViewRef).pop();
        });

        await screen.findByText("List Content");
        expect(liveTags(requireView(stackViewRef))).toHaveLength(1);
    });

    it("rejects when rendered outside a NavigationContainer", async () => {
        await expect(
            render(
                <Tab.Navigator>
                    <Tab.Screen name="Inbox" component={InboxScreen} />
                </Tab.Navigator>,
            ),
        ).rejects.toThrow();
    });
});
