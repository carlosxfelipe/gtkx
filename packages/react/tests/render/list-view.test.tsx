import { getInterface } from "@gtkx/ffi";
import * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { GridView, Label, ListView } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

const getModelItemCount = (listView: Gtk.ListView): number => {
    const model = listView.getModel();
    if (!model) return 0;
    const listModel = getInterface(model.id, Gio.ListModel);
    return listModel?.getNItems() ?? 0;
};

describe("render - ListView", () => {
    describe("ListView.Root", () => {
        it("creates ListView widget", async () => {
            const ref = createRef<Gtk.ListView>();

            render(
                <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                    <ListView.Item id="1" item={{ name: "First" }} />
                </ListView.Root>,
            );
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
        });

        it("sets up SignalListItemFactory", async () => {
            const ref = createRef<Gtk.ListView>();

            render(
                <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                    <ListView.Item id="1" item={{ name: "First" }} />
                </ListView.Root>,
            );
            await flushMicrotasks();

            expect(ref.current?.getFactory()).not.toBeNull();
        });
    });

    describe("ListView.Item", () => {
        it("adds item to list model", async () => {
            const ref = createRef<Gtk.ListView>();

            render(
                <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                </ListView.Root>,
            );
            await flushMicrotasks();

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(2);
        });

        it("inserts item before existing item", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: { id: string; name: string }[] }) {
                return (
                    <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                        {items.map((item) => (
                            <ListView.Item key={item.id} id={item.id} item={item} />
                        ))}
                    </ListView.Root>
                );
            }

            render(
                <App
                    items={[
                        { id: "1", name: "First" },
                        { id: "3", name: "Third" },
                    ]}
                />,
            );
            await flushMicrotasks();

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(2);

            render(
                <App
                    items={[
                        { id: "1", name: "First" },
                        { id: "2", name: "Second" },
                        { id: "3", name: "Third" },
                    ]}
                />,
            );
            await flushMicrotasks();

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(3);
        });

        it("removes item from list model", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: { id: string; name: string }[] }) {
                return (
                    <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                        {items.map((item) => (
                            <ListView.Item key={item.id} id={item.id} item={item} />
                        ))}
                    </ListView.Root>
                );
            }

            render(
                <App
                    items={[
                        { id: "1", name: "A" },
                        { id: "2", name: "B" },
                        { id: "3", name: "C" },
                    ]}
                />,
            );
            await flushMicrotasks();

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(3);

            render(
                <App
                    items={[
                        { id: "1", name: "A" },
                        { id: "3", name: "C" },
                    ]}
                />,
            );
            await flushMicrotasks();

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(2);
        });

        it("updates item data", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ itemName }: { itemName: string }) {
                return (
                    <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                        <ListView.Item id="1" item={{ name: itemName }} />
                    </ListView.Root>
                );
            }

            render(<App itemName="Initial" />);
            await flushMicrotasks();

            render(<App itemName="Updated" />);
            await flushMicrotasks();
        });
    });

    describe("renderItem", () => {
        it("receives item data in renderItem", async () => {
            const ref = createRef<Gtk.ListView>();
            const renderItem = vi.fn((item: { name: string } | null) => <Label label={item?.name ?? "Empty"} />);

            render(
                <ListView.Root ref={ref} renderItem={renderItem}>
                    <ListView.Item id="1" item={{ name: "Test Item" }} />
                </ListView.Root>,
            );
            await flushMicrotasks();
        });

        it("updates when renderItem function changes", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ prefix }: { prefix: string }) {
                return (
                    <ListView.Root
                        ref={ref}
                        renderItem={(item: { name: string } | null) => (
                            <Label label={`${prefix}: ${item?.name ?? ""}`} />
                        )}
                    >
                        <ListView.Item id="1" item={{ name: "Test" }} />
                    </ListView.Root>
                );
            }

            render(<App prefix="First" />);
            await flushMicrotasks();

            render(<App prefix="Second" />);
            await flushMicrotasks();
        });
    });

    describe("selection - single", () => {
        it("sets selected item via selected prop", async () => {
            const ref = createRef<Gtk.ListView>();

            render(
                <ListView.Root ref={ref} renderItem={() => <Label label="Item" />} selected={["2"]}>
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                </ListView.Root>,
            );
            await flushMicrotasks();
        });

        it("calls onSelectionChanged when selection changes", async () => {
            const ref = createRef<Gtk.ListView>();
            const onSelectionChanged = vi.fn();

            render(
                <ListView.Root
                    ref={ref}
                    renderItem={() => <Label label="Item" />}
                    onSelectionChanged={onSelectionChanged}
                >
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                </ListView.Root>,
            );
            await flushMicrotasks();

            expect(onSelectionChanged).toHaveBeenCalled();
        });

        it("handles unselect (empty selection)", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ selected }: { selected: string[] }) {
                return (
                    <ListView.Root ref={ref} renderItem={() => <Label label="Item" />} selected={selected}>
                        <ListView.Item id="1" item={{ name: "First" }} />
                    </ListView.Root>
                );
            }

            render(<App selected={["1"]} />);
            await flushMicrotasks();

            render(<App selected={[]} />);
            await flushMicrotasks();
        });
    });

    describe("selection - multiple", () => {
        it("enables multi-select with selectionMode", async () => {
            const ref = createRef<Gtk.ListView>();

            render(
                <ListView.Root
                    ref={ref}
                    renderItem={() => <Label label="Item" />}
                    selectionMode={Gtk.SelectionMode.MULTIPLE}
                >
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                </ListView.Root>,
            );
            await flushMicrotasks();
        });

        it("sets multiple selected items", async () => {
            const ref = createRef<Gtk.ListView>();

            render(
                <ListView.Root
                    ref={ref}
                    renderItem={() => <Label label="Item" />}
                    selectionMode={Gtk.SelectionMode.MULTIPLE}
                    selected={["1", "3"]}
                >
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                    <ListView.Item id="3" item={{ name: "Third" }} />
                </ListView.Root>,
            );
            await flushMicrotasks();
        });

        it("calls onSelectionChanged with array of ids", async () => {
            const ref = createRef<Gtk.ListView>();
            const onSelectionChanged = vi.fn();

            render(
                <ListView.Root
                    ref={ref}
                    renderItem={() => <Label label="Item" />}
                    selectionMode={Gtk.SelectionMode.MULTIPLE}
                    onSelectionChanged={onSelectionChanged}
                >
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                </ListView.Root>,
            );
            await flushMicrotasks();

            expect(onSelectionChanged).toHaveBeenCalledWith(expect.any(Array));
        });
    });

    describe("GridView.Root", () => {
        it("creates GridView widget", async () => {
            const ref = createRef<Gtk.GridView>();

            render(
                <GridView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                    <GridView.Item id="1" item={{ name: "First" }} />
                </GridView.Root>,
            );
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
        });
    });
});
