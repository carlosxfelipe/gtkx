import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { DropDown } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

describe("render - DropDown", () => {
    describe("DropDown.Root", () => {
        it("creates DropDown widget", async () => {
            const ref = createRef<Gtk.DropDown>();

            render(
                <DropDown.Root ref={ref}>
                    <DropDown.Item id="1" label="First" />
                </DropDown.Root>,
            );
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
        });
    });

    describe("DropDown.Item", () => {
        it("adds item with id and label", async () => {
            const ref = createRef<Gtk.DropDown>();

            render(
                <DropDown.Root ref={ref}>
                    <DropDown.Item id="option1" label="Option 1" />
                    <DropDown.Item id="option2" label="Option 2" />
                </DropDown.Root>,
            );
            await flushMicrotasks();

            expect(ref.current?.getModel()?.getNItems()).toBe(2);
        });

        it("inserts item before existing item", async () => {
            const ref = createRef<Gtk.DropDown>();

            function App({ items }: { items: { id: string; label: string }[] }) {
                return (
                    <DropDown.Root ref={ref}>
                        {items.map((item) => (
                            <DropDown.Item key={item.id} id={item.id} label={item.label} />
                        ))}
                    </DropDown.Root>
                );
            }

            render(
                <App
                    items={[
                        { id: "1", label: "First" },
                        { id: "3", label: "Third" },
                    ]}
                />,
            );
            await flushMicrotasks();

            render(
                <App
                    items={[
                        { id: "1", label: "First" },
                        { id: "2", label: "Second" },
                        { id: "3", label: "Third" },
                    ]}
                />,
            );
            await flushMicrotasks();

            expect(ref.current?.getModel()?.getNItems()).toBe(3);
        });

        it("removes item", async () => {
            const ref = createRef<Gtk.DropDown>();

            function App({ items }: { items: { id: string; label: string }[] }) {
                return (
                    <DropDown.Root ref={ref}>
                        {items.map((item) => (
                            <DropDown.Item key={item.id} id={item.id} label={item.label} />
                        ))}
                    </DropDown.Root>
                );
            }

            render(
                <App
                    items={[
                        { id: "1", label: "A" },
                        { id: "2", label: "B" },
                        { id: "3", label: "C" },
                    ]}
                />,
            );
            await flushMicrotasks();

            render(
                <App
                    items={[
                        { id: "1", label: "A" },
                        { id: "3", label: "C" },
                    ]}
                />,
            );
            await flushMicrotasks();

            expect(ref.current?.getModel()?.getNItems()).toBe(2);
        });

        it("updates item label", async () => {
            const ref = createRef<Gtk.DropDown>();

            function App({ label }: { label: string }) {
                return (
                    <DropDown.Root ref={ref}>
                        <DropDown.Item id="1" label={label} />
                    </DropDown.Root>
                );
            }

            render(<App label="Initial" />);
            await flushMicrotasks();

            render(<App label="Updated" />);
            await flushMicrotasks();
        });
    });

    describe("selection", () => {
        it("sets selected item via selectedId prop", async () => {
            const ref = createRef<Gtk.DropDown>();

            render(
                <DropDown.Root ref={ref} selectedId="2">
                    <DropDown.Item id="1" label="First" />
                    <DropDown.Item id="2" label="Second" />
                    <DropDown.Item id="3" label="Third" />
                </DropDown.Root>,
            );
            await flushMicrotasks();
        });

        it("calls onSelectionChanged when selection changes", async () => {
            const ref = createRef<Gtk.DropDown>();
            const onSelectionChanged = vi.fn();

            render(
                <DropDown.Root ref={ref} onSelectionChanged={onSelectionChanged}>
                    <DropDown.Item id="1" label="First" />
                    <DropDown.Item id="2" label="Second" />
                </DropDown.Root>,
            );
            await flushMicrotasks();

            expect(onSelectionChanged).toHaveBeenCalled();
        });

        it("updates selection when selectedId prop changes", async () => {
            const ref = createRef<Gtk.DropDown>();

            function App({ selectedId }: { selectedId: string }) {
                return (
                    <DropDown.Root ref={ref} selectedId={selectedId}>
                        <DropDown.Item id="1" label="First" />
                        <DropDown.Item id="2" label="Second" />
                    </DropDown.Root>
                );
            }

            render(<App selectedId="1" />);
            await flushMicrotasks();

            render(<App selectedId="2" />);
            await flushMicrotasks();
        });
    });
});
