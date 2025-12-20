import type * as Gtk from "@gtkx/ffi/gtk";
import { DropDown } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("render - DropDown", () => {
    describe("DropDown.Root", () => {
        it("creates DropDown widget", async () => {
            const ref = createRef<Gtk.DropDown>();

            await render(
                <DropDown.Root ref={ref}>
                    <DropDown.Item id="1" label="First" />
                </DropDown.Root>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });
    });

    describe("DropDown.Item", () => {
        it("adds item with id and label", async () => {
            const ref = createRef<Gtk.DropDown>();

            await render(
                <DropDown.Root ref={ref}>
                    <DropDown.Item id="option1" label="Option 1" />
                    <DropDown.Item id="option2" label="Option 2" />
                </DropDown.Root>,
                { wrapper: false },
            );

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

            await render(
                <App
                    items={[
                        { id: "1", label: "First" },
                        { id: "3", label: "Third" },
                    ]}
                />,
                { wrapper: false },
            );

            await render(
                <App
                    items={[
                        { id: "1", label: "First" },
                        { id: "2", label: "Second" },
                        { id: "3", label: "Third" },
                    ]}
                />,
                { wrapper: false },
            );

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

            await render(
                <App
                    items={[
                        { id: "1", label: "A" },
                        { id: "2", label: "B" },
                        { id: "3", label: "C" },
                    ]}
                />,
                { wrapper: false },
            );

            await render(
                <App
                    items={[
                        { id: "1", label: "A" },
                        { id: "3", label: "C" },
                    ]}
                />,
                { wrapper: false },
            );

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

            await render(<App label="Initial" />, { wrapper: false });

            await render(<App label="Updated" />, { wrapper: false });
        });
    });

    describe("selection", () => {
        it("sets selected item via selectedId prop", async () => {
            const ref = createRef<Gtk.DropDown>();

            await render(
                <DropDown.Root ref={ref} selectedId="2">
                    <DropDown.Item id="1" label="First" />
                    <DropDown.Item id="2" label="Second" />
                    <DropDown.Item id="3" label="Third" />
                </DropDown.Root>,
                { wrapper: false },
            );
        });

        it("calls onSelectionChanged when selection changes", async () => {
            const ref = createRef<Gtk.DropDown>();
            const onSelectionChanged = vi.fn();

            await render(
                <DropDown.Root ref={ref} onSelectionChanged={onSelectionChanged}>
                    <DropDown.Item id="1" label="First" />
                    <DropDown.Item id="2" label="Second" />
                </DropDown.Root>,
                { wrapper: false },
            );

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

            await render(<App selectedId="1" />, { wrapper: false });

            await render(<App selectedId="2" />, { wrapper: false });
        });
    });
});
