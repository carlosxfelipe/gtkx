import { NavigationView } from "@gtkx/components/adw";
import * as Adw from "@gtkx/gi/adw";
import { AdwNavigationPage, AdwNavigationSplitView } from "@gtkx/jsx/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import { createRef, type RefObject, useState } from "react";
import { describe, expect, it, vi } from "vitest";

const requireView = (ref: RefObject<Adw.NavigationView | null>): Adw.NavigationView => {
    const view = ref.current;
    if (!view) throw new Error("NavigationView ref was not populated");
    return view;
};

const liveTags = (view: Adw.NavigationView): string[] => {
    const model = view.getNavigationStack();
    const tags: string[] = [];
    const count = model.getNItems();
    for (let index = 0; index < count; index++) {
        const item = model.getItem(index);
        if (item instanceof Adw.NavigationPage) {
            const tag = item.getTag();
            if (tag !== null) tags.push(tag);
        }
    }
    return tags;
};

const ListPage = () => (
    <NavigationView.Page tag="list" title="List">
        <GtkLabel>List Content</GtkLabel>
    </NavigationView.Page>
);

const TaskPage = () => (
    <NavigationView.Page tag="task" title="Task">
        <GtkLabel>Task Content</GtkLabel>
    </NavigationView.Page>
);

describe("NavigationView - stack from JSX", () => {
    it("pushes the first mounted page and makes it visible", async () => {
        const viewRef = createRef<Adw.NavigationView>();

        await render(<NavigationView ref={viewRef}>{ListPage()}</NavigationView>);

        await screen.findByText("List Content");
        expect(liveTags(requireView(viewRef))).toEqual(["list"]);
        expect(viewRef.current?.getVisiblePageTag()).toBe("list");
    });

    it("pushes a second page when it mounts and pops it when it unmounts", async () => {
        const viewRef = createRef<Adw.NavigationView>();

        const App = ({ open }: { open: boolean }) => (
            <NavigationView ref={viewRef}>
                {ListPage()}
                {open ? TaskPage() : null}
            </NavigationView>
        );

        const { rerender } = await render(<App open={false} />);
        expect(liveTags(requireView(viewRef))).toEqual(["list"]);

        await rerender(<App open={true} />);
        await screen.findByText("Task Content");
        expect(liveTags(requireView(viewRef))).toEqual(["list", "task"]);
        expect(viewRef.current?.getVisiblePageTag()).toBe("task");

        await rerender(<App open={false} />);
        expect(liveTags(requireView(viewRef))).toEqual(["list"]);
        expect(viewRef.current?.getVisiblePageTag()).toBe("list");
    });

    it("builds a deep initial stack in one step", async () => {
        const viewRef = createRef<Adw.NavigationView>();

        await render(
            <NavigationView ref={viewRef}>
                {ListPage()}
                {TaskPage()}
            </NavigationView>,
        );

        await screen.findByText("Task Content");
        expect(liveTags(requireView(viewRef))).toEqual(["list", "task"]);
        expect(viewRef.current?.getVisiblePageTag()).toBe("task");
    });

    it("keeps the stack when a page body changes under the same tag", async () => {
        const viewRef = createRef<Adw.NavigationView>();

        const App = ({ selecting }: { selecting: boolean }) => (
            <NavigationView ref={viewRef}>
                <NavigationView.Page tag="list" title="List">
                    <GtkLabel>{selecting ? "Selecting" : "Browsing"}</GtkLabel>
                </NavigationView.Page>
            </NavigationView>
        );

        const { rerender } = await render(<App selecting={false} />);
        await screen.findByText("Browsing");
        expect(liveTags(requireView(viewRef))).toEqual(["list"]);

        await rerender(<App selecting={true} />);
        await screen.findByText("Selecting");
        expect(liveTags(requireView(viewRef))).toEqual(["list"]);
    });
});

describe("NavigationView - widget-initiated pops", () => {
    it("reports a widget pop through onPop so JSX can unmount the page", async () => {
        const viewRef = createRef<Adw.NavigationView>();
        const onPop = vi.fn();

        const App = () => {
            const [open, setOpen] = useState(true);
            return (
                <NavigationView
                    ref={viewRef}
                    onPop={(tag) => {
                        onPop(tag);
                        if (tag === "task") setOpen(false);
                    }}
                >
                    {ListPage()}
                    {open ? TaskPage() : null}
                </NavigationView>
            );
        };

        await render(<App />);
        expect(liveTags(requireView(viewRef))).toEqual(["list", "task"]);

        await act(() => {
            viewRef.current?.pop();
        });

        expect(onPop).toHaveBeenCalledTimes(1);
        expect(onPop).toHaveBeenCalledWith("task");
        expect(liveTags(requireView(viewRef))).toEqual(["list"]);
    });

    it("does not fire onPop for a React-driven pop", async () => {
        const viewRef = createRef<Adw.NavigationView>();
        const onPop = vi.fn();

        const App = ({ open }: { open: boolean }) => (
            <NavigationView ref={viewRef} onPop={onPop}>
                {ListPage()}
                {open ? TaskPage() : null}
            </NavigationView>
        );

        const { rerender } = await render(<App open={true} />);
        expect(liveTags(requireView(viewRef))).toEqual(["list", "task"]);

        await rerender(<App open={false} />);
        expect(liveTags(requireView(viewRef))).toEqual(["list"]);
        expect(onPop).not.toHaveBeenCalled();
    });

    it("re-pushes a popped page on the next render when the app keeps it mounted", async () => {
        const viewRef = createRef<Adw.NavigationView>();

        const App = ({ tick }: { tick: number }) => {
            void tick;
            return (
                <NavigationView ref={viewRef} onPop={() => {}}>
                    {ListPage()}
                    {TaskPage()}
                </NavigationView>
            );
        };

        const { rerender } = await render(<App tick={0} />);
        expect(liveTags(requireView(viewRef))).toEqual(["list", "task"]);

        await act(() => {
            viewRef.current?.pop();
        });
        expect(liveTags(requireView(viewRef))).toEqual(["list"]);

        await rerender(<App tick={1} />);
        expect(liveTags(requireView(viewRef))).toEqual(["list", "task"]);
        expect(viewRef.current?.getVisiblePageTag()).toBe("task");
    });
});

describe("NavigationView - nested in AdwNavigationSplitView (tutorial shape)", () => {
    it("pushes and pops the detail page inside the split view content", async () => {
        const viewRef = createRef<Adw.NavigationView>();

        const App = ({ openTask }: { openTask: boolean }) => (
            <AdwNavigationSplitView
                sidebar={
                    <AdwNavigationPage tag="sidebar" title="Sidebar">
                        <GtkLabel>Sidebar</GtkLabel>
                    </AdwNavigationPage>
                }
                content={
                    <AdwNavigationPage tag="content" title="Content">
                        <NavigationView ref={viewRef} popOnEscape={false} onPop={() => {}}>
                            <NavigationView.Page tag="list" title="List">
                                <GtkLabel>List Content</GtkLabel>
                            </NavigationView.Page>
                            {openTask ? (
                                <NavigationView.Page tag="task" title="Task">
                                    <GtkLabel>Task Content</GtkLabel>
                                </NavigationView.Page>
                            ) : null}
                        </NavigationView>
                    </AdwNavigationPage>
                }
            />
        );

        const { rerender } = await render(<App openTask={false} />);
        await screen.findByText("List Content");
        expect(liveTags(requireView(viewRef))).toEqual(["list"]);

        await rerender(<App openTask={true} />);
        await screen.findByText("Task Content");
        expect(liveTags(requireView(viewRef))).toEqual(["list", "task"]);
        expect(viewRef.current?.getVisiblePageTag()).toBe("task");

        await rerender(<App openTask={false} />);
        expect(liveTags(requireView(viewRef))).toEqual(["list"]);
        expect(viewRef.current?.getVisiblePageTag()).toBe("list");
    });
});

describe("NavigationView - guards", () => {
    it("throws when a Page is rendered outside a NavigationView", async () => {
        await expect(
            render(
                <NavigationView.Page tag="orphan" title="Orphan">
                    <GtkLabel>Orphan</GtkLabel>
                </NavigationView.Page>,
            ),
        ).rejects.toThrow(/must be a child of <NavigationView>/);
    });
});
