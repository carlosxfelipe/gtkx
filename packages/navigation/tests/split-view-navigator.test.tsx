import type * as Adw from "@gtkx/gi/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import { createRef, type RefObject } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    createNavigationContainerRef,
    createSplitViewNavigator,
    NavigationContainer,
    type NavigationContainerRefWithCurrent,
    type NavigationState,
    type NavigatorScreenParams,
} from "../src/index.js";
import { ListScreen, liveTags, requireView, Stack, TaskScreen, type TasksParams } from "./fixtures.js";

type ShellParams = {
    Sidebar: undefined;
    Tasks: NavigatorScreenParams<TasksParams> | undefined;
};

const requireSplitView = (ref: RefObject<Adw.NavigationSplitView | null>): Adw.NavigationSplitView => {
    const view = ref.current;
    if (!view) throw new Error("NavigationSplitView ref was not populated");
    return view;
};

const SidebarScreen = () => <GtkLabel>Sidebar Content</GtkLabel>;
const TasksScreen = () => <GtkLabel>Tasks Content</GtkLabel>;

const Split = createSplitViewNavigator<ShellParams>();

type SplitHarness = {
    viewRef: RefObject<Adw.NavigationSplitView | null>;
    navigationRef: NavigationContainerRefWithCurrent<ShellParams>;
    view: () => Adw.NavigationSplitView;
};

const renderSplit = async (
    options: {
        collapsed?: boolean;
        onStateChange?: (state: NavigationState | undefined) => void;
        tasksComponent?: () => React.ReactNode;
        sidebarTitle?: string;
    } = {},
): Promise<SplitHarness> => {
    const viewRef = createRef<Adw.NavigationSplitView>();
    const navigationRef = createNavigationContainerRef<ShellParams>();

    await render(
        <NavigationContainer
            ref={navigationRef}
            {...(options.onStateChange !== undefined && { onStateChange: options.onStateChange })}
        >
            <Split.Navigator ref={viewRef} {...(options.collapsed !== undefined && { collapsed: options.collapsed })}>
                <Split.Screen
                    name="Sidebar"
                    component={SidebarScreen}
                    {...(options.sidebarTitle !== undefined && { options: { title: options.sidebarTitle } })}
                />
                <Split.Screen name="Tasks" component={options.tasksComponent ?? TasksScreen} />
            </Split.Navigator>
        </NavigationContainer>,
    );

    return { viewRef, navigationRef, view: () => requireSplitView(viewRef) };
};

describe("split-view navigator", () => {
    it("renders both panes into the sidebar and content slots", async () => {
        const harness = await renderSplit({ sidebarTitle: "Tasks" });

        await screen.findByText("Sidebar Content");
        await screen.findByText("Tasks Content");
        expect(harness.view().getSidebar()?.getTitle()).toBe("Tasks");
        expect(harness.view().getContent()?.getTitle()).toBe("Tasks");
    });

    it("flips showContent when navigating to the content screen", async () => {
        const harness = await renderSplit({ collapsed: true });

        expect(harness.view().getShowContent()).toBe(false);

        await act(() => {
            harness.navigationRef.navigate("Tasks");
        });

        expect(harness.view().getShowContent()).toBe(true);
        expect(harness.navigationRef.getRootState().index).toBe(1);
    });

    it("dispatches back to the sidebar on a widget-initiated showContent change without echoing", async () => {
        const onStateChange = vi.fn();
        const harness = await renderSplit({ collapsed: true, onStateChange });

        await act(() => {
            harness.navigationRef.navigate("Tasks");
        });
        onStateChange.mockClear();

        await act(() => {
            harness.view().setShowContent(false);
        });

        expect(harness.navigationRef.getRootState().index).toBe(0);
        expect(onStateChange).toHaveBeenCalledTimes(1);
        expect(harness.view().getShowContent()).toBe(false);
    });

    it("supports goBack to the sidebar through the tab router", async () => {
        const harness = await renderSplit();

        await act(() => {
            harness.navigationRef.navigate("Tasks");
        });
        expect(harness.navigationRef.getRootState().index).toBe(1);

        await act(() => {
            harness.navigationRef.goBack();
        });
        expect(harness.navigationRef.getRootState().index).toBe(0);
    });

    it("throws without a content screen", async () => {
        await expect(
            render(
                <NavigationContainer>
                    <Split.Navigator>
                        <Split.Screen name="Sidebar" component={SidebarScreen} />
                    </Split.Navigator>
                </NavigationContainer>,
            ),
        ).rejects.toThrow(/at least one content screen/);
    });

    it("hosts a nested stack navigator in the content pane (tutorial shape)", async () => {
        const stackViewRef = createRef<Adw.NavigationView>();

        const TasksStack = () => (
            <Stack.Navigator ref={stackViewRef} popOnEscape={false}>
                <Stack.Screen name="List" component={ListScreen} options={{ title: "Tasks" }} />
                <Stack.Screen name="Task" component={TaskScreen} />
            </Stack.Navigator>
        );

        const harness = await renderSplit({ tasksComponent: TasksStack });

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
});
