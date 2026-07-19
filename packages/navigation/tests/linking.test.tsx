import type * as Adw from "@gtkx/gi/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import type { InitialState } from "@react-navigation/core";
import { createRef, type ReactNode, type RefObject } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    createNavigationContainerRef,
    type LinkingConfig,
    type LinkingOptions,
    NavigationContainer,
    type NavigationContainerRefWithCurrent,
    useLinkPath,
    useLinkURL,
} from "../src/index.js";
import { ListScreen, liveTags, requireView, Stack, TaskScreen, type TasksParams } from "./fixtures.js";

const PREFIXES = ["myapp://"];

const CONFIG: LinkingConfig<TasksParams> = {
    initialRouteName: "List",
    screens: { List: "list", Task: "tasks/:id" },
};

const linkingWith = (extra: Partial<LinkingOptions<TasksParams>> = {}): LinkingOptions<TasksParams> => ({
    prefixes: PREFIXES,
    config: CONFIG,
    ...extra,
});

type LinkedOptions = {
    linking?: LinkingOptions<TasksParams>;
    fallback?: ReactNode;
    initialState?: InitialState;
    listComponent?: () => ReactNode;
    taskComponent?: () => ReactNode;
};

type LinkedHarness = {
    viewRef: RefObject<Adw.NavigationView | null>;
    navigationRef: NavigationContainerRefWithCurrent<TasksParams>;
    view: () => Adw.NavigationView;
    unmount: () => Promise<void>;
    tags: () => string[];
};

const renderLinked = async (options: LinkedOptions = {}): Promise<LinkedHarness> => {
    const viewRef = createRef<Adw.NavigationView>();
    const navigationRef = createNavigationContainerRef<TasksParams>();

    const { unmount } = await render(
        <NavigationContainer
            ref={navigationRef}
            {...(options.linking !== undefined && { linking: options.linking })}
            {...(options.fallback !== undefined && { fallback: options.fallback })}
            {...(options.initialState !== undefined && { initialState: options.initialState })}
        >
            <Stack.Navigator ref={viewRef}>
                <Stack.Screen name="List" component={options.listComponent ?? ListScreen} />
                <Stack.Screen name="Task" component={options.taskComponent ?? TaskScreen} />
            </Stack.Navigator>
        </NavigationContainer>,
    );

    return {
        viewRef,
        navigationRef,
        view: () => requireView(viewRef),
        unmount,
        tags: () => liveTags(requireView(viewRef)),
    };
};

const deferred = () => {
    let resolve: (url: string | undefined) => void = () => {};
    const promise = new Promise<string | undefined>((settle) => {
        resolve = settle;
    });
    return { promise, resolve };
};

describe("linking", () => {
    it("mounts directly on the deep-linked route for a synchronous getInitialURL", async () => {
        const fallbackRender = vi.fn(() => <GtkLabel>Loading</GtkLabel>);
        const Fallback = (): ReactNode => fallbackRender();

        const harness = await renderLinked({
            linking: linkingWith({ getInitialURL: () => "myapp://tasks/42" }),
            fallback: <Fallback />,
        });

        await screen.findByText("Task 42");
        expect(harness.tags()).toHaveLength(2);
        expect(fallbackRender).not.toHaveBeenCalled();
        expect(screen.queryByText("Loading")).toBeNull();
    });

    it("renders the fallback until an async getInitialURL resolves", async () => {
        const { promise, resolve } = deferred();
        const harness = await renderLinked({
            linking: linkingWith({ getInitialURL: () => promise }),
            fallback: <GtkLabel>Loading</GtkLabel>,
        });

        await screen.findByText("Loading");
        expect(harness.viewRef.current).toBeNull();

        await act(async () => {
            resolve("myapp://tasks/42");
            await promise;
        });

        await screen.findByText("Task 42");
        expect(harness.tags()).toHaveLength(2);
        expect(screen.queryByText("Loading")).toBeNull();
    });

    it("prefers an explicit initialState over the resolved link", async () => {
        const harness = await renderLinked({
            linking: linkingWith({ getInitialURL: () => "myapp://tasks/42" }),
            initialState: { index: 0, routes: [{ name: "List" }] },
        });

        await screen.findByText("List Content");
        expect(harness.tags()).toHaveLength(1);
        expect(screen.queryByText("Task 42")).toBeNull();
    });

    it("ignores the url when linking is disabled", async () => {
        const getInitialURL = vi.fn(() => "myapp://tasks/42");
        const harness = await renderLinked({ linking: linkingWith({ enabled: false, getInitialURL }) });

        await screen.findByText("List Content");
        expect(harness.tags()).toHaveLength(1);
        expect(getInitialURL).not.toHaveBeenCalled();
    });

    it("leaves the state untouched when the scheme matches no prefix", async () => {
        const harness = await renderLinked({ linking: linkingWith({ getInitialURL: () => "other://tasks/42" }) });

        await screen.findByText("List Content");
        expect(harness.tags()).toHaveLength(1);
        expect(harness.navigationRef.getRootState().routes).toHaveLength(1);
    });

    it("navigates through a user-supplied subscribe and tears it down on unmount", async () => {
        const teardown = vi.fn();
        let listener: ((url: string) => void) | undefined;
        const subscribe = vi.fn((next: (url: string) => void) => {
            listener = next;
            return teardown;
        });

        const harness = await renderLinked({ linking: linkingWith({ subscribe }) });

        await screen.findByText("List Content");
        expect(subscribe).toHaveBeenCalledTimes(1);
        expect(typeof listener).toBe("function");

        await act(() => {
            listener?.("myapp://tasks/99");
        });

        await screen.findByText("Task 99");
        expect(harness.tags()).toHaveLength(2);
        expect(teardown).not.toHaveBeenCalled();

        await harness.unmount();
        expect(teardown).toHaveBeenCalledTimes(1);
    });

    it("exposes the focused path and url and updates as the stack changes", async () => {
        const Probe = ({ label }: { label: string }): ReactNode => (
            <GtkLabel>{`${label} ${String(useLinkPath())} ${String(useLinkURL())}`}</GtkLabel>
        );

        const harness = await renderLinked({
            linking: linkingWith(),
            listComponent: () => <Probe label="list" />,
            taskComponent: () => <Probe label="task" />,
        });

        await screen.findByText("list /list myapp://list");

        await act(() => {
            harness.navigationRef.navigate("Task", { id: "42" });
        });

        await screen.findByText("task /tasks/42 myapp://tasks/42");

        await act(() => {
            harness.navigationRef.goBack();
        });

        await screen.findByText("list /list myapp://list");
        expect(screen.queryByText("task /tasks/42 myapp://tasks/42")).toBeNull();
    });

    it("returns undefined from the link hooks without a linking prop", async () => {
        const Probe = (): ReactNode => (
            <GtkLabel>{`path ${String(useLinkPath())} url ${String(useLinkURL())}`}</GtkLabel>
        );

        await renderLinked({ listComponent: () => <Probe /> });

        await screen.findByText("path undefined url undefined");
    });

    it("mounts with a linking prop and no Application ancestor", async () => {
        const harness = await renderLinked({ linking: linkingWith({ subscribe: () => undefined }) });

        await screen.findByText("List Content");
        expect(harness.tags()).toHaveLength(1);
    });

    it("throws for an invalid linking config at mount", async () => {
        const invalid: LinkingConfig<TasksParams> = { screens: { List: "list" } };
        Object.assign(invalid, { exact: true });

        await expect(
            render(
                <NavigationContainer linking={{ prefixes: PREFIXES, config: invalid }}>
                    <Stack.Navigator>
                        <Stack.Screen name="List" component={ListScreen} />
                        <Stack.Screen name="Task" component={TaskScreen} />
                    </Stack.Navigator>
                </NavigationContainer>,
            ),
        ).rejects.toThrow(/Found invalid properties/);
    });
});
