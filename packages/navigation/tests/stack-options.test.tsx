import * as Adw from "@gtkx/gi/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import { createRef, type ReactNode, type RefObject, useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    createNavigationContainerRef,
    createStackNavigator,
    NavigationContainer,
    type StackNavigationProp,
    type StackScreenOptions,
    useNavigation,
} from "../src/index.js";
import { ListScreen, liveTags, requireView, TaskScreen, type TasksParams } from "./fixtures.js";

const Stack = createStackNavigator<TasksParams>();

type TransitionEvent = { type: string; target: string | undefined; closing: boolean };

type OptionsHarness = {
    viewRef: RefObject<Adw.NavigationView | null>;
    navigationRef: ReturnType<typeof createNavigationContainerRef<TasksParams>>;
    view: () => Adw.NavigationView;
    events: TransitionEvent[];
};

type RenderOptions = {
    listOptions?: StackScreenOptions;
    taskOptions?: StackScreenOptions;
    listComponent?: () => ReactNode;
    listText?: string;
    onPushed?: () => void;
    onReplaced?: () => void;
};

let recorded: TransitionEvent[] = [];

const recordEvent =
    (type: string) =>
    (event: { target?: string; data: { closing: boolean } }): void => {
        recorded.push({ type, target: event.target, closing: event.data.closing });
    };

const useTransitionRecorder = (): void => {
    const navigation = useNavigation<StackNavigationProp<TasksParams>>();

    useEffect(() => {
        const offStart = navigation.addListener("transitionStart", recordEvent("transitionStart"));
        const offEnd = navigation.addListener("transitionEnd", recordEvent("transitionEnd"));
        return () => {
            offStart();
            offEnd();
        };
    }, [navigation]);
};

const RecordingList = (): ReactNode => {
    useTransitionRecorder();
    return <ListScreen />;
};

const RecordingTask = (): ReactNode => {
    useTransitionRecorder();
    return <TaskScreen />;
};

const renderOptionsStack = async (options: RenderOptions = {}): Promise<OptionsHarness> => {
    const viewRef = createRef<Adw.NavigationView>();
    const navigationRef = createNavigationContainerRef<TasksParams>();
    recorded = [];
    const events = recorded;

    await render(
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
                ref={viewRef}
                screenListeners={{
                    transitionStart: recordEvent("transitionStart"),
                    transitionEnd: recordEvent("transitionEnd"),
                }}
                {...(options.onPushed !== undefined && { onPushed: options.onPushed })}
                {...(options.onReplaced !== undefined && { onReplaced: options.onReplaced })}
            >
                <Stack.Screen
                    name="List"
                    component={options.listComponent ?? RecordingList}
                    {...(options.listOptions !== undefined && { options: options.listOptions })}
                />
                <Stack.Screen
                    name="Task"
                    component={RecordingTask}
                    {...(options.taskOptions !== undefined && { options: options.taskOptions })}
                />
            </Stack.Navigator>
        </NavigationContainer>,
    );

    await screen.findByText(options.listText ?? "List Content");
    return { viewRef, navigationRef, view: () => requireView(viewRef), events };
};

const openTask = async (harness: OptionsHarness, id: string): Promise<void> => {
    await act(() => {
        harness.navigationRef.navigate("Task", { id });
    });
    await screen.findByText(`Task ${id}`);
};

const routeKeys = (harness: OptionsHarness): string[] =>
    harness.navigationRef.getRootState().routes.map((route) => route.key);

describe("stack navigator - tag option", () => {
    it("uses the custom tag as the widget tag while diffing on it", async () => {
        const harness = await renderOptionsStack({
            listOptions: { tag: "list" },
            taskOptions: { tag: "task" },
        });

        expect(liveTags(harness.view())).toEqual(["list"]);

        await openTask(harness, "42");

        expect(liveTags(harness.view())).toEqual(["list", "task"]);
        expect(harness.view().getVisiblePageTag()).toBe("task");
        expect(harness.view().findPage("task")).not.toBeNull();
    });

    it("maps a widget pop of a custom tagged page back to its route key", async () => {
        const harness = await renderOptionsStack({ taskOptions: { tag: "task" } });

        await openTask(harness, "42");
        expect(routeKeys(harness)).toHaveLength(2);

        await act(() => {
            harness.view().pop();
        });

        expect(routeKeys(harness)).toHaveLength(1);
        await screen.findByText("List Content");
    });

    it("falls back to the route key when no tag option is set", async () => {
        const harness = await renderOptionsStack();

        expect(liveTags(harness.view())).toEqual(routeKeys(harness));
    });

    it("rejects two pages claiming the same tag", async () => {
        await expect(
            renderOptionsStack({ listOptions: { tag: "same" }, taskOptions: { tag: "same" } }).then(async (harness) => {
                await openTask(harness, "1");
            }),
        ).rejects.toThrow(/Duplicate stack page tag/);
    });
});

describe("stack navigator - transition events", () => {
    it("emits transitionStart and transitionEnd for the pushed page", async () => {
        const harness = await renderOptionsStack();
        harness.events.length = 0;

        await openTask(harness, "42");

        const taskKey = routeKeys(harness)[1];
        const forTask = harness.events.filter((event) => event.target === taskKey);
        expect(forTask).toEqual([
            { type: "transitionStart", target: taskKey, closing: false },
            { type: "transitionEnd", target: taskKey, closing: false },
        ]);
    });

    it("emits closing transitions for the popped page", async () => {
        const harness = await renderOptionsStack();

        await openTask(harness, "42");
        const taskKey = routeKeys(harness)[1];
        harness.events.length = 0;

        await act(() => {
            harness.navigationRef.goBack();
        });
        await screen.findByText("List Content");

        const forTask = harness.events.filter((event) => event.target === taskKey);
        expect(forTask).toEqual([
            { type: "transitionStart", target: taskKey, closing: true },
            { type: "transitionEnd", target: taskKey, closing: true },
        ]);
    });

    it("keeps the lingering release working while emitting transitions", async () => {
        const harness = await renderOptionsStack();

        await openTask(harness, "42");
        const taskKey = routeKeys(harness)[1];
        if (taskKey === undefined) throw new Error("Missing task key");

        await act(() => {
            harness.view().pop();
        });
        await screen.findByText("List Content");

        expect(liveTags(harness.view())).toHaveLength(1);
        expect(harness.view().findPage(taskKey)).toBeNull();
    });
});

describe("stack navigator - widget push and replace signals", () => {
    it("does not echo the navigator's own diff back to onPushed or onReplaced", async () => {
        const onPushed = vi.fn();
        const onReplaced = vi.fn();
        const harness = await renderOptionsStack({ onPushed, onReplaced });

        await openTask(harness, "42");

        expect(onPushed).not.toHaveBeenCalled();
        expect(onReplaced).not.toHaveBeenCalled();
    });

    it("reports a widget initiated push", async () => {
        const onPushed = vi.fn();
        const harness = await renderOptionsStack({ onPushed });

        await act(() => {
            harness.view().push(Adw.NavigationPage.new(Adw.Bin.new(), "External"));
        });

        expect(onPushed).toHaveBeenCalledTimes(1);
    });

    it("reports a widget initiated replace", async () => {
        const onReplaced = vi.fn();
        const harness = await renderOptionsStack({ onReplaced });

        await openTask(harness, "42");
        const rootKey = routeKeys(harness)[0];
        if (rootKey === undefined) throw new Error("Missing root key");

        await act(() => {
            harness.view().replaceWithTags([rootKey]);
        });

        expect(onReplaced).toHaveBeenCalledTimes(1);
    });
});

describe("stack navigator - freezeOnBlur", () => {
    const makeProbe = (): { component: () => ReactNode; log: string[] } => {
        const log: string[] = [];
        const component = (): ReactNode => {
            useEffect(() => {
                log.push("mount");
                return () => {
                    log.push("unmount");
                };
            }, []);
            return <GtkLabel>Probe Content</GtkLabel>;
        };
        return { component, log };
    };

    it("tears down the blurred screen's effects and restores them on focus", async () => {
        const probe = makeProbe();
        const harness = await renderOptionsStack({
            listComponent: probe.component,
            listOptions: { freezeOnBlur: true },
            listText: "Probe Content",
        });
        expect(probe.log).toEqual(["mount"]);

        await openTask(harness, "42");
        expect(probe.log).toEqual(["mount", "unmount"]);

        await act(() => {
            harness.navigationRef.goBack();
        });
        await screen.findByText("Probe Content");

        expect(probe.log).toEqual(["mount", "unmount", "mount"]);
    });

    it("keeps a blurred screen live when freezeOnBlur is off", async () => {
        const probe = makeProbe();
        const harness = await renderOptionsStack({ listComponent: probe.component, listText: "Probe Content" });

        await openTask(harness, "42");

        expect(probe.log).toEqual(["mount"]);
    });
});
