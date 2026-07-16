import type * as Adw from "@gtkx/gi/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    createNavigationContainerRef,
    createStackNavigator,
    NavigationContainer,
    StackActions,
    usePreventRemove,
} from "../src/index.js";
import {
    ListScreen,
    liveTags,
    openTask,
    renderStack,
    requireView,
    Stack,
    type StackHarness,
    TaskScreen,
    type TasksParams,
} from "./fixtures.js";

const DEEP_INITIAL_STATE = { index: 1, routes: [{ name: "List" }, { name: "Task", params: { id: "7" } }] };

const renderDeepStack = async (): Promise<StackHarness> => {
    const harness = await renderStack({ initialState: DEEP_INITIAL_STATE });
    await screen.findByText("Task 7");
    return harness;
};

const expectVisibleTop = (harness: StackHarness, depth: number): void => {
    expect(liveTags(harness.view())).toHaveLength(depth);
    expect(harness.view().getVisiblePageTag()).toBe(harness.navigationRef.getRootState().routes[depth - 1]?.key);
};

const expectPopReducesOnce = async (pop: (harness: StackHarness) => void): Promise<StackHarness> => {
    const onStateChange = vi.fn();
    const harness = await renderStack({ onStateChange });

    await openTask(harness, "42", "Task 42");
    onStateChange.mockClear();

    await act(() => {
        pop(harness);
    });

    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(harness.navigationRef.getRootState().routes).toHaveLength(1);
    expect(liveTags(harness.view())).toHaveLength(1);
    return harness;
};

describe("stack navigator - state to widget", () => {
    it("pushes the initial route and maps title options to the page", async () => {
        const viewRef = createRef<Adw.NavigationView>();
        const navigationRef = createNavigationContainerRef<TasksParams>();

        await render(
            <NavigationContainer ref={navigationRef}>
                <Stack.Navigator ref={viewRef}>
                    <Stack.Screen name="List" component={ListScreen} options={{ title: "Tasks" }} />
                    <Stack.Screen name="Task" component={TaskScreen} />
                </Stack.Navigator>
            </NavigationContainer>,
        );

        await screen.findByText("List Content");
        const view = requireView(viewRef);
        const state = navigationRef.getRootState();
        expect(liveTags(view)).toEqual(state.routes.map((route) => route.key));
        expect(liveTags(view)).toHaveLength(1);
        expect(view.getVisiblePage()?.getTitle()).toBe("Tasks");
    });

    it("pushes on navigate and passes params to the screen", async () => {
        const harness = await renderStack();

        await openTask(harness, "42", "Task 42");

        const state = harness.navigationRef.getRootState();
        expect(liveTags(harness.view())).toEqual(state.routes.map((route) => route.key));
        expect(liveTags(harness.view())).toHaveLength(2);
        expect(harness.view().getVisiblePageTag()).toBe(state.routes[1]?.key);
        expect(harness.view().getVisiblePage()?.getTitle()).toBe("Task");
    });

    it("updates params of the visible route without growing the stack", async () => {
        const harness = await renderStack();

        await openTask(harness, "42", "Task 42");
        await openTask(harness, "43", "Task 43");

        expect(liveTags(harness.view())).toHaveLength(2);
    });

    it("builds a deep initial state in one render", async () => {
        const harness = await renderDeepStack();

        expectVisibleTop(harness, 2);
    });

    it("pops on goBack without a feedback dispatch", async () => {
        await expectPopReducesOnce((harness) => harness.navigationRef.goBack());
    });

    it("pops the whole tail on popTo", async () => {
        const harness = await renderDeepStack();

        await act(() => {
            harness.navigationRef.dispatch(StackActions.popTo("List"));
        });

        expectVisibleTop(harness, 1);
    });
});

describe("stack navigator - widget-initiated pops", () => {
    it("reduces a widget pop into navigation state exactly once", async () => {
        await expectPopReducesOnce((harness) => harness.view().pop());
        await screen.findByText("List Content");
    });

    it("reduces multiple synchronous widget pops from popToTag correctly", async () => {
        const viewRef = createRef<Adw.NavigationView>();
        const SettingsScreen = () => <GtkLabel>Settings Content</GtkLabel>;
        const DeepStack = createStackNavigator<TasksParams & { Settings: undefined }>();
        const navigationRef = createNavigationContainerRef<TasksParams & { Settings: undefined }>();

        await render(
            <NavigationContainer
                ref={navigationRef}
                initialState={{
                    index: 2,
                    routes: [{ name: "List" }, { name: "Task", params: { id: "7" } }, { name: "Settings" }],
                }}
            >
                <DeepStack.Navigator ref={viewRef}>
                    <DeepStack.Screen name="List" component={ListScreen} />
                    <DeepStack.Screen name="Task" component={TaskScreen} />
                    <DeepStack.Screen name="Settings" component={SettingsScreen} />
                </DeepStack.Navigator>
            </NavigationContainer>,
        );
        await screen.findByText("Settings Content");
        expect(liveTags(requireView(viewRef))).toHaveLength(3);

        const rootKey = navigationRef.getRootState().routes[0]?.key;
        if (!rootKey) throw new Error("Missing root route key");

        await act(() => {
            requireView(viewRef).popToTag(rootKey);
        });

        expect(navigationRef.getRootState().routes).toHaveLength(1);
        expect(liveTags(requireView(viewRef))).toHaveLength(1);
        await screen.findByText("List Content");
    });

    it("maps canPop options onto the page", async () => {
        const harness = await renderStack({ taskOptions: { canPop: false } });

        await openTask(harness, "42", "Task 42");

        expect(harness.view().getVisiblePage()?.getCanPop()).toBe(false);
    });

    it("re-pushes the page when usePreventRemove blocks a widget pop", async () => {
        const onBeforeRemove = vi.fn();
        const GuardedTask = () => {
            usePreventRemove(true, onBeforeRemove);
            return <GtkLabel>Guarded Content</GtkLabel>;
        };
        const harness = await renderStack({ taskComponent: GuardedTask });

        await openTask(harness, "42", "Guarded Content");
        expect(harness.view().getVisiblePage()?.getCanPop()).toBe(false);

        await act(() => {
            harness.view().pop();
        });

        expect(onBeforeRemove).toHaveBeenCalledTimes(1);
        expect(harness.navigationRef.getRootState().routes).toHaveLength(2);
        expect(liveTags(harness.view())).toHaveLength(2);
        expect(harness.view().getVisiblePageTag()).toBe(harness.navigationRef.getRootState().routes[1]?.key);
    });
});

describe("stack navigator - guards", () => {
    it("throws when the navigator is rendered outside a NavigationContainer", async () => {
        await expect(
            render(
                <Stack.Navigator>
                    <Stack.Screen name="List" component={ListScreen} />
                </Stack.Navigator>,
            ),
        ).rejects.toThrow();
    });
});
