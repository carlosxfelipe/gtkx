import type * as Adw from "@gtkx/gi/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen, waitFor } from "@gtkx/testing";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    CommonActions,
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

const THREE_DEEP_INITIAL_STATE = {
    index: 2,
    routes: [{ name: "List" }, { name: "Task", params: { id: "1" } }, { name: "Task", params: { id: "2" } }],
};

const routeKeys = (harness: StackHarness): string[] =>
    harness.navigationRef.getRootState().routes.map((route) => route.key);

const requireKey = (harness: StackHarness, index: number): string => {
    const key = routeKeys(harness)[index];
    if (key === undefined) throw new Error(`Missing route key at index ${index}`);
    return key;
};

const renderThreeDeepStack = async (): Promise<StackHarness> => {
    const harness = await renderStack({ initialState: THREE_DEEP_INITIAL_STATE });
    await screen.findByText("Task 2");
    return harness;
};

type ResetRoute = { key?: string; name: string; params?: { id: string } };

const resetTo = async (harness: StackHarness, routes: ResetRoute[]): Promise<void> => {
    await act(() => {
        harness.navigationRef.dispatch(CommonActions.reset({ index: routes.length - 1, routes }));
    });
};

const waitForLiveTags = async (harness: StackHarness): Promise<void> => {
    await waitFor(() => {
        expect(liveTags(harness.view())).toEqual(routeKeys(harness));
    });
};

const expectConverged = (harness: StackHarness): void => {
    const keys = routeKeys(harness);
    expect(liveTags(harness.view())).toEqual(keys);
    expect(harness.view().getVisiblePageTag()).toBe(keys[keys.length - 1]);
};

const expectReleased = async (harness: StackHarness, keys: string[]): Promise<void> => {
    await waitFor(() => {
        for (const key of keys) expect(harness.view().findPage(key)).toBeNull();
    });
};

describe("stack navigator - diff convergence", () => {
    it("leaves the widget stack untouched when desired equals live", async () => {
        let bump: (() => void) | undefined;
        const BumpScreen = () => {
            const [count, setCount] = useState(0);
            bump = () => {
                setCount((current) => current + 1);
            };
            return <GtkLabel>{`Bumped ${count}`}</GtkLabel>;
        };
        const harness = await renderStack({ taskComponent: BumpScreen });

        await openTask(harness, "42", "Bumped 0");

        const replaced = vi.fn();
        harness.view().on("replaced", replaced);
        const tagsBefore = liveTags(harness.view());
        const visibleBefore = harness.view().getVisiblePageTag();

        await act(() => {
            bump?.();
        });
        await screen.findByText("Bumped 1");

        expect(liveTags(harness.view())).toEqual(tagsBefore);
        expect(harness.view().getVisiblePageTag()).toBe(visibleBefore);
        expect(replaced).not.toHaveBeenCalled();
    });

    it("keeps a widget-popped page parented until it emits hidden", async () => {
        const harness = await renderStack({ animations: true });

        await openTask(harness, "42", "Task 42");
        const poppedKey = requireKey(harness, 1);

        await act(() => {
            harness.view().pop();
        });

        expect(harness.view().findPage(poppedKey)).not.toBeNull();
        expect(liveTags(harness.view())).toHaveLength(1);

        await expectReleased(harness, [poppedKey]);
        expect(liveTags(harness.view())).toHaveLength(1);
    });

    it("swaps the top page on replace", async () => {
        const harness = await renderStack();

        await openTask(harness, "42", "Task 42");
        const bottomKey = requireKey(harness, 0);
        const replacedKey = requireKey(harness, 1);

        await act(() => {
            harness.navigationRef.dispatch(StackActions.replace("Task", { id: "99" }));
        });
        await screen.findByText("Task 99");

        const keys = routeKeys(harness);
        expect(keys[0]).toBe(bottomKey);
        expect(keys[1]).not.toBe(replacedKey);
        expectConverged(harness);
        expect(liveTags(harness.view())).toHaveLength(2);
        await expectReleased(harness, [replacedKey]);
    });

    it("converges and releases old pages on an arbitrary reset", async () => {
        const harness = await renderStack();

        await openTask(harness, "42", "Task 42");
        const oldKeys = routeKeys(harness);

        await resetTo(harness, [
            { name: "Task", params: { id: "8" } },
            { name: "Task", params: { id: "9" } },
        ]);
        await screen.findByText("Task 9");

        const keys = routeKeys(harness);
        expect(keys).toHaveLength(2);
        for (const key of keys) expect(oldKeys).not.toContain(key);
        expectConverged(harness);
        await expectReleased(harness, oldKeys);
        expect(liveTags(harness.view())).toEqual(routeKeys(harness));
    });

    it("converges on a reorder that is neither a prefix nor an append", async () => {
        const harness = await renderThreeDeepStack();

        const [listKey, firstKey, secondKey] = routeKeys(harness);
        if (listKey === undefined || firstKey === undefined || secondKey === undefined)
            throw new Error("Missing route keys");

        await resetTo(harness, [
            { key: secondKey, name: "Task", params: { id: "2" } },
            { key: listKey, name: "List" },
            { key: firstKey, name: "Task", params: { id: "1" } },
        ]);

        await waitForLiveTags(harness);
        expect(routeKeys(harness)).toEqual([secondKey, listKey, firstKey]);
        expectConverged(harness);
    });

    it("builds a three deep initial state in one render", async () => {
        const harness = await renderThreeDeepStack();

        expect(liveTags(harness.view())).toEqual(routeKeys(harness));
        expect(liveTags(harness.view())).toHaveLength(3);
        expectVisibleTop(harness, 3);
    });

    it("collapses to a single page on popToTop", async () => {
        const harness = await renderThreeDeepStack();

        await act(() => {
            harness.navigationRef.dispatch(StackActions.popToTop());
        });
        await screen.findByText("List Content");

        expect(liveTags(harness.view())).toHaveLength(1);
        expectConverged(harness);
    });

    it("converges across rapid successive stack changes", async () => {
        const harness = await renderStack();

        await act(() => {
            harness.navigationRef.dispatch(StackActions.push("Task", { id: "1" }));
            harness.navigationRef.dispatch(StackActions.push("Task", { id: "2" }));
            harness.navigationRef.dispatch(StackActions.push("Task", { id: "3" }));
        });
        await screen.findByText("Task 3");
        expectConverged(harness);

        await act(() => {
            harness.navigationRef.dispatch(StackActions.pop(2));
            harness.navigationRef.dispatch(StackActions.push("Task", { id: "4" }));
        });
        await screen.findByText("Task 4");

        await waitForLiveTags(harness);
        expectConverged(harness);
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
