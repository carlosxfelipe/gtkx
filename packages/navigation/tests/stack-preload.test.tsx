import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, screen } from "@gtkx/testing";
import { type ReactNode, useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { CommonActions, useRoute } from "../src/index.js";
import { liveTags, renderStack, type StackHarness, type TasksParams } from "./fixtures.js";

type PreloadHarness = { harness: StackHarness; mounts: () => number };

const countedScreen = (onMount: () => void): (() => ReactNode) => {
    return (): ReactNode => {
        const route = useRoute();
        useEffect(onMount, []);
        return <GtkLabel>{`Task ${(route.params as TasksParams["Task"]).id}`}</GtkLabel>;
    };
};

const preloadTask = async (id: string): Promise<PreloadHarness> => {
    const onMount = vi.fn();
    const harness = await renderStack({ taskComponent: countedScreen(onMount) });

    await act(() => {
        harness.navigationRef.dispatch(CommonActions.preload("Task", { id }));
    });

    return { harness, mounts: () => onMount.mock.calls.length };
};

describe("stack navigator - preload", () => {
    it("mounts a preloaded screen without pushing it onto the stack", async () => {
        const { harness, mounts } = await preloadTask("5");

        expect(mounts()).toBe(1);
        expect(liveTags(harness.view())).toHaveLength(1);
        expect(harness.navigationRef.getRootState().routes).toHaveLength(1);
    });

    it("reuses the preloaded screen when navigating to it", async () => {
        const { harness, mounts } = await preloadTask("5");

        await act(() => {
            harness.navigationRef.navigate("Task", { id: "5" });
        });

        await screen.findByText("Task 5");
        expect(mounts()).toBe(1);
        expect(liveTags(harness.view())).toHaveLength(2);
    });

    it("updates the params of a preloaded screen it reuses", async () => {
        const { harness, mounts } = await preloadTask("9");

        await act(() => {
            harness.navigationRef.navigate("Task", { id: "1" });
        });

        await screen.findByText("Task 1");
        expect(mounts()).toBe(1);
        expect(liveTags(harness.view())).toHaveLength(2);
    });
});
