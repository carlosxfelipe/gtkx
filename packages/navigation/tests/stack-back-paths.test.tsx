import type * as Adw from "@gtkx/gi/adw";
import * as Gtk from "@gtkx/gi/gtk";
import { AdwHeaderBar, AdwToolbarView } from "@gtkx/jsx/adw";
import { GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen, userEvent } from "@gtkx/testing";
import { createRef, type ReactNode, type RefObject } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    createNavigationContainerRef,
    createStackNavigator,
    NavigationContainer,
    type NavigationContainerRefWithCurrent,
    type ParamListBase,
    usePreventRemove,
} from "../src/index.js";
import { liveTags, openTask, renderStack, requireView, type StackHarness } from "./fixtures.js";

type OuterParams = { List: undefined; Task: undefined };
type InnerParams = { One: undefined; Two: undefined };

const Outer = createStackNavigator<OuterParams>();
const Inner = createStackNavigator<InnerParams>();

const InnerOne = (): ReactNode => <GtkLabel>Inner One</GtkLabel>;
const InnerTwo = (): ReactNode => <GtkLabel>Inner Two</GtkLabel>;

const guardedComponent = (text: string, onBeforeRemove: () => void) => (): ReactNode => {
    usePreventRemove(true, onBeforeRemove);
    return <GtkLabel>{text}</GtkLabel>;
};
const ListContent = (): ReactNode => <GtkLabel>List Content</GtkLabel>;

type NestedOptions = {
    innerDepth: 1 | 2;
    innerCanPop?: boolean;
    popOnEscape?: boolean;
    onInnerBeforeRemove?: () => void;
};

type NestedHarness = {
    outerRef: RefObject<Adw.NavigationView | null>;
    innerRef: RefObject<Adw.NavigationView | null>;
    navigationRef: NavigationContainerRefWithCurrent<ParamListBase>;
};

const nestedInitialState = (innerDepth: 1 | 2) => {
    const routes = innerDepth === 2 ? [{ name: "One" }, { name: "Two" }] : [{ name: "One" }];
    return {
        index: 1,
        routes: [{ name: "List" }, { name: "Task", state: { index: routes.length - 1, routes } }],
    };
};

const renderNested = async (options: NestedOptions): Promise<NestedHarness> => {
    const outerRef = createRef<Adw.NavigationView>();
    const innerRef = createRef<Adw.NavigationView>();
    const navigationRef = createNavigationContainerRef<ParamListBase>();
    const screenOptions = options.innerCanPop === undefined ? {} : { options: { canPop: options.innerCanPop } };

    const guard = options.onInnerBeforeRemove;
    const two = guard === undefined ? InnerTwo : guardedComponent("Inner Two", guard);

    const InnerStack = (): ReactNode => (
        <Inner.Navigator
            ref={innerRef}
            {...(options.popOnEscape !== undefined && { popOnEscape: options.popOnEscape })}
        >
            <Inner.Screen name="One" component={InnerOne} {...screenOptions} />
            <Inner.Screen name="Two" component={two} {...screenOptions} />
        </Inner.Navigator>
    );

    await render(
        <NavigationContainer ref={navigationRef} initialState={nestedInitialState(options.innerDepth)}>
            <Outer.Navigator ref={outerRef}>
                <Outer.Screen name="List" component={ListContent} />
                <Outer.Screen name="Task" component={InnerStack} />
            </Outer.Navigator>
        </NavigationContainer>,
    );

    return { outerRef, innerRef, navigationRef };
};

const stackDepths = (navigationRef: NavigationContainerRefWithCurrent<ParamListBase>) => {
    const state = navigationRef.getRootState();
    const focused = state.routes[state.index];
    return { outer: state.routes.length, outerIndex: state.index, inner: focused?.state?.routes.length ?? null };
};

const pressEscape = async (text: string): Promise<void> => {
    const label = await screen.findByText(text);
    await userEvent.keyboard(label, "{Escape}");
};

const escapeOnNested = async (options: NestedOptions): Promise<NestedHarness> => {
    const harness = await renderNested(options);
    await pressEscape(options.innerDepth === 2 ? "Inner Two" : "Inner One");
    return harness;
};

describe("stack navigator - nested Escape propagation", () => {
    it("pops only the inner stack when the inner stack can pop", async () => {
        const harness = await escapeOnNested({ innerDepth: 2 });

        expect(stackDepths(harness.navigationRef)).toEqual({ outer: 2, outerIndex: 1, inner: 1 });
        expect(liveTags(requireView(harness.innerRef))).toHaveLength(1);
        expect(liveTags(requireView(harness.outerRef))).toHaveLength(2);
        await screen.findByText("Inner One");
    });

    it("falls through to the outer stack when the inner stack is at its root", async () => {
        const harness = await escapeOnNested({ innerDepth: 1 });

        expect(stackDepths(harness.navigationRef)).toEqual({ outer: 1, outerIndex: 0, inner: null });
        expect(liveTags(requireView(harness.outerRef))).toHaveLength(1);
        await screen.findByText("List Content");
    });

    it("swallows Escape when the inner visible page cannot pop", async () => {
        const harness = await escapeOnNested({ innerDepth: 2, innerCanPop: false });

        expect(stackDepths(harness.navigationRef)).toEqual({ outer: 2, outerIndex: 1, inner: 2 });
        expect(liveTags(requireView(harness.innerRef))).toHaveLength(2);
        expect(liveTags(requireView(harness.outerRef))).toHaveLength(2);
        await screen.findByText("Inner Two");
    });

    it("swallows Escape at the inner root when the page cannot pop, leaving the outer stack alone", async () => {
        const harness = await escapeOnNested({ innerDepth: 1, innerCanPop: false });

        expect(stackDepths(harness.navigationRef)).toEqual({ outer: 2, outerIndex: 1, inner: 1 });
        expect(liveTags(requireView(harness.outerRef))).toHaveLength(2);
        await screen.findByText("Inner One");
    });

    it("pops the outer stack when the inner navigator disables popOnEscape", async () => {
        const harness = await escapeOnNested({ innerDepth: 2, popOnEscape: false });

        expect(stackDepths(harness.navigationRef)).toEqual({ outer: 1, outerIndex: 0, inner: null });
        expect(liveTags(requireView(harness.outerRef))).toHaveLength(1);
        await screen.findByText("List Content");
    });

    it("pops the outer stack when popOnEscape is disabled and the inner stack is at its root", async () => {
        const harness = await escapeOnNested({ innerDepth: 1, popOnEscape: false });

        expect(stackDepths(harness.navigationRef)).toEqual({ outer: 1, outerIndex: 0, inner: null });
        await screen.findByText("List Content");
    });
});

const HeaderScreen = ({ text }: { text: string }): ReactNode => (
    <AdwToolbarView topBar={<AdwHeaderBar />}>
        <GtkLabel>{text}</GtkLabel>
    </AdwToolbarView>
);

const HeaderList = (): ReactNode => <HeaderScreen text="List Content" />;
const HeaderTask = (): ReactNode => <HeaderScreen text="Task Content" />;

type HeaderStackOptions = { canPop?: boolean; onBeforeRemove?: () => void };

type HeaderHarness = {
    viewRef: RefObject<Adw.NavigationView | null>;
    navigationRef: NavigationContainerRefWithCurrent<ParamListBase>;
};

const GuardedHeaderTask = ({ onBeforeRemove }: { onBeforeRemove: () => void }): ReactNode => {
    usePreventRemove(true, onBeforeRemove);
    return <HeaderScreen text="Task Content" />;
};

const renderHeaderStack = async (options: HeaderStackOptions = {}): Promise<HeaderHarness> => {
    const viewRef = createRef<Adw.NavigationView>();
    const navigationRef = createNavigationContainerRef<ParamListBase>();
    const guard = options.onBeforeRemove;
    const Task = guard === undefined ? HeaderTask : () => <GuardedHeaderTask onBeforeRemove={guard} />;

    await render(
        <NavigationContainer
            ref={navigationRef}
            initialState={{ index: 1, routes: [{ name: "List" }, { name: "Task" }] }}
        >
            <Outer.Navigator ref={viewRef}>
                <Outer.Screen name="List" component={HeaderList} />
                <Outer.Screen
                    name="Task"
                    component={Task}
                    {...(options.canPop !== undefined && { options: { canPop: options.canPop } })}
                />
            </Outer.Navigator>
        </NavigationContainer>,
    );

    await screen.findByText("Task Content");
    return { viewRef, navigationRef };
};

const backButtons = (widget: Gtk.Widget): Gtk.Widget[] => {
    const found: Gtk.Widget[] = [];
    if (widget.getName() === "AdwBackButton") found.push(widget);
    for (let child = widget.getFirstChild(); child; child = child.getNextSibling()) {
        found.push(...backButtons(child));
    }
    return found;
};

const visiblePageOf = (viewRef: RefObject<Adw.NavigationView | null>): Adw.NavigationPage => {
    const page = requireView(viewRef).getVisiblePage();
    if (!page) throw new Error("NavigationView has no visible page");
    return page;
};

const renderGuardedStack = async (onBeforeRemove: () => void): Promise<StackHarness> => {
    const GuardedTask = (): ReactNode => {
        usePreventRemove(true, onBeforeRemove);
        return <GtkLabel>Guarded Content</GtkLabel>;
    };
    const harness = await renderStack({ taskComponent: GuardedTask });
    await openTask(harness, "42", "Guarded Content");
    return harness;
};

describe("stack navigator - back paths", () => {
    it("reduces a programmatic widget pop into state exactly once", async () => {
        const onStateChange = vi.fn();
        const harness = await renderStack({ onStateChange });

        await openTask(harness, "42", "Task 42");
        onStateChange.mockClear();

        await act(() => {
            harness.view().pop();
        });

        expect(onStateChange).toHaveBeenCalledTimes(1);
        expect(harness.navigationRef.getRootState().routes).toHaveLength(1);
        expect(liveTags(harness.view())).toHaveLength(1);
    });

    it("pops programmatically even when the visible page cannot pop", async () => {
        const harness = await renderStack({ taskOptions: { canPop: false } });

        await openTask(harness, "42", "Task 42");
        expect(harness.view().getVisiblePage()?.getCanPop()).toBe(false);

        await act(() => {
            harness.view().pop();
        });

        expect(harness.navigationRef.getRootState().routes).toHaveLength(1);
        expect(liveTags(harness.view())).toHaveLength(1);
        await screen.findByText("List Content");
    });

    it("swallows Escape on a single stack when the visible page cannot pop", async () => {
        const harness = await renderStack({ taskOptions: { canPop: false } });

        await openTask(harness, "42", "Task 42");
        await pressEscape("Task 42");

        expect(harness.navigationRef.getRootState().routes).toHaveLength(2);
        expect(liveTags(harness.view())).toHaveLength(2);
    });

    it("leaves canPop alone on a prevented route", async () => {
        const harness = await renderGuardedStack(() => undefined);

        expect(harness.view().getVisiblePage()?.getCanPop()).toBe(true);
    });

    it("shows the header back button when the visible page can pop", async () => {
        const harness = await renderHeaderStack({ canPop: true });

        const buttons = backButtons(visiblePageOf(harness.viewRef));

        expect(buttons).toHaveLength(1);
        expect(buttons[0]?.getVisible()).toBe(true);
    });

    it("hides the header back button when the visible page cannot pop", async () => {
        const harness = await renderHeaderStack({ canPop: false });

        const buttons = backButtons(visiblePageOf(harness.viewRef));

        expect(buttons).toHaveLength(1);
        expect(buttons[0]?.getVisible()).toBe(false);
    });

    it("keeps the header back button visible on a prevented route", async () => {
        const harness = await renderHeaderStack({ onBeforeRemove: () => undefined });

        const buttons = backButtons(visiblePageOf(harness.viewRef));

        expect(buttons).toHaveLength(1);
        expect(buttons[0]?.getVisible()).toBe(true);
    });
});

const findButton = (widget: Gtk.Widget): Gtk.Button | null => {
    if (widget instanceof Gtk.Button) return widget;
    for (let child = widget.getFirstChild(); child; child = child.getNextSibling()) {
        const found = findButton(child);
        if (found) return found;
    }
    return null;
};

const clickBackButton = async (harness: HeaderHarness): Promise<void> => {
    const back = backButtons(visiblePageOf(harness.viewRef))[0];
    if (!back) throw new Error("No back button on the visible page");
    const button = findButton(back);
    if (!button) throw new Error("The back button has no clickable child");
    await userEvent.click(button);
};

const gestureControllers = (view: Adw.NavigationView): Gtk.GestureClick[] => {
    const controllers = view.observeControllers();
    const found: Gtk.GestureClick[] = [];
    for (let index = 0; index < controllers.getNItems(); index++) {
        const controller = controllers.getItem(index);
        if (controller instanceof Gtk.GestureClick) found.push(controller);
    }
    return found;
};

describe("stack navigator - header back button", () => {
    it("pops through the navigator when the visible page can pop", async () => {
        const harness = await renderHeaderStack();

        await clickBackButton(harness);

        expect(harness.navigationRef.getRootState().routes).toHaveLength(1);
        expect(liveTags(requireView(harness.viewRef))).toHaveLength(1);
        await screen.findByText("List Content");
    });

    it("fires beforeRemove and keeps the page when the route is prevented", async () => {
        const onBeforeRemove = vi.fn();
        const harness = await renderHeaderStack({ onBeforeRemove });

        await clickBackButton(harness);

        expect(onBeforeRemove).toHaveBeenCalledTimes(1);
        expect(harness.navigationRef.getRootState().routes).toHaveLength(2);
        expect(liveTags(requireView(harness.viewRef))).toHaveLength(2);
        await screen.findByText("Task Content");
    });

    it("stays correct after the page is unmounted and pushed again", async () => {
        const harness = await renderHeaderStack();

        await clickBackButton(harness);
        await screen.findByText("List Content");

        await act(() => {
            harness.navigationRef.navigate("Task");
        });
        await screen.findByText("Task Content");
        await clickBackButton(harness);

        expect(harness.navigationRef.getRootState().routes).toHaveLength(1);
        expect(liveTags(requireView(harness.viewRef))).toHaveLength(1);
    });

    it("forwards the pop action to the outer navigator when the inner stack is at its root", async () => {
        const harness = await renderNested({ innerDepth: 1 });
        const page = requireView(harness.innerRef).getVisiblePage();
        if (!page) throw new Error("Inner navigator has no visible page");

        await act(() => {
            page.activateAction("navigation.pop", null);
        });

        expect(stackDepths(harness.navigationRef)).toEqual({ outer: 1, outerIndex: 0, inner: null });
        expect(liveTags(requireView(harness.outerRef))).toHaveLength(1);
        await screen.findByText("List Content");
    });
});

describe("stack navigator - mouse back gesture", () => {
    it("denies presses from buttons that are not back or forward", async () => {
        const harness = await renderHeaderStack();
        const view = requireView(harness.viewRef);

        await act(() => {
            for (const gesture of gestureControllers(view)) gesture.emit("pressed", 1, 0, 0);
        });

        expect(harness.navigationRef.getRootState().routes).toHaveLength(2);
        expect(liveTags(view)).toHaveLength(2);
    });

    it("replaces the built-in back and forward click gesture instead of stacking onto it", async () => {
        const harness = await renderHeaderStack();

        expect(gestureControllers(requireView(harness.viewRef))).toHaveLength(1);
    });

    it("leaves ordinary clicks inside a page working", async () => {
        const onClicked = vi.fn();
        const ClickableTask = (): ReactNode => <GtkButton label="Press Me" onClicked={onClicked} />;
        const harness = await renderStack({ taskComponent: ClickableTask });

        await openTask(harness, "42", "Press Me");
        await userEvent.click(await screen.findByText("Press Me"));

        expect(onClicked).toHaveBeenCalledTimes(1);
        expect(harness.navigationRef.getRootState().routes).toHaveLength(2);
        expect(liveTags(harness.view())).toHaveLength(2);
    });
});

describe("stack navigator - keyboard back", () => {
    it("reduces an Escape press into state exactly once", async () => {
        const onStateChange = vi.fn();
        const harness = await renderStack({ onStateChange });

        await openTask(harness, "42", "Task 42");
        onStateChange.mockClear();

        await pressEscape("Task 42");

        expect(onStateChange).toHaveBeenCalledTimes(1);
        expect(harness.navigationRef.getRootState().routes).toHaveLength(1);
        expect(liveTags(harness.view())).toHaveLength(1);
    });

    it("pops through the navigator on Alt+Left", async () => {
        const harness = await renderStack();

        await openTask(harness, "42", "Task 42");
        const label = await screen.findByText("Task 42");
        await userEvent.keyboard(label, "{Alt>}{ArrowLeft}{/Alt}");

        expect(harness.navigationRef.getRootState().routes).toHaveLength(1);
        expect(liveTags(harness.view())).toHaveLength(1);
    });

    it("fires beforeRemove on Alt+Left for a prevented route", async () => {
        const onBeforeRemove = vi.fn();
        const harness = await renderGuardedStack(onBeforeRemove);

        const label = await screen.findByText("Guarded Content");
        await userEvent.keyboard(label, "{Alt>}{ArrowLeft}{/Alt}");

        expect(onBeforeRemove).toHaveBeenCalledTimes(1);
        expect(harness.navigationRef.getRootState().routes).toHaveLength(2);
        expect(liveTags(harness.view())).toHaveLength(2);
    });
});

describe("stack navigator - beforeRemove", () => {
    it("fires beforeRemove for an Escape press on a prevented route", async () => {
        const onBeforeRemove = vi.fn();
        const harness = await renderGuardedStack(onBeforeRemove);

        await pressEscape("Guarded Content");

        expect(onBeforeRemove).toHaveBeenCalledTimes(1);
        expect(harness.navigationRef.getRootState().routes).toHaveLength(2);
        expect(liveTags(harness.view())).toHaveLength(2);
    });

    it("swallows Escape on a prevented inner route without popping the outer stack", async () => {
        const onBeforeRemove = vi.fn();
        const harness = await escapeOnNested({ innerDepth: 2, onInnerBeforeRemove: onBeforeRemove });

        expect(onBeforeRemove).toHaveBeenCalledTimes(1);
        expect(stackDepths(harness.navigationRef)).toEqual({ outer: 2, outerIndex: 1, inner: 2 });
        expect(liveTags(requireView(harness.innerRef))).toHaveLength(2);
        expect(liveTags(requireView(harness.outerRef))).toHaveLength(2);
        await screen.findByText("Inner Two");
    });

    it("fires beforeRemove for a programmatic goBack on a prevented route", async () => {
        const onBeforeRemove = vi.fn();
        const harness = await renderGuardedStack(onBeforeRemove);

        await act(() => {
            harness.navigationRef.goBack();
        });

        expect(onBeforeRemove).toHaveBeenCalledTimes(1);
        expect(harness.navigationRef.getRootState().routes).toHaveLength(2);
        expect(liveTags(harness.view())).toHaveLength(2);
    });
});
