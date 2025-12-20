import type * as Gtk from "@gtkx/ffi/gtk";
import { Label, ListBox } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

const getRowLabels = (listBox: Gtk.ListBox): string[] => {
    const labels: string[] = [];
    let row = listBox.getRowAtIndex(0);
    let index = 0;
    while (row) {
        const child = row.getChild();
        if (child && "getLabel" in child && typeof child.getLabel === "function") {
            labels.push((child as Gtk.Label).getLabel() ?? "");
        }
        index++;
        row = listBox.getRowAtIndex(index);
    }
    return labels;
};

describe("render - ListBox", () => {
    describe("adding items", () => {
        it("appends child widgets", async () => {
            const ref = createRef<Gtk.ListBox>();

            await render(
                <ListBox ref={ref}>
                    <Label label="First" />
                    <Label label="Second" />
                </ListBox>,
                { wrapper: false },
            );

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["First", "Second"]);
        });

        it("maintains correct order", async () => {
            const ref = createRef<Gtk.ListBox>();

            await render(
                <ListBox ref={ref}>
                    <Label label="A" />
                    <Label label="B" />
                    <Label label="C" />
                </ListBox>,
                { wrapper: false },
            );

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["A", "B", "C"]);
        });
    });

    describe("inserting items", () => {
        it("inserts child at correct position", async () => {
            const ref = createRef<Gtk.ListBox>();

            function App({ items }: { items: string[] }) {
                return (
                    <ListBox ref={ref}>
                        {items.map((item) => (
                            <Label key={item} label={item} />
                        ))}
                    </ListBox>
                );
            }

            await render(<App items={["A", "C"]} />, { wrapper: false });

            await render(<App items={["A", "B", "C"]} />, { wrapper: false });

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["A", "B", "C"]);
        });
    });

    describe("removing items", () => {
        it("removes child widget", async () => {
            const ref = createRef<Gtk.ListBox>();

            function App({ items }: { items: string[] }) {
                return (
                    <ListBox ref={ref}>
                        {items.map((item) => (
                            <Label key={item} label={item} />
                        ))}
                    </ListBox>
                );
            }

            await render(<App items={["A", "B", "C"]} />, { wrapper: false });

            await render(<App items={["A", "C"]} />, { wrapper: false });

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["A", "C"]);
        });
    });

    describe("reordering items", () => {
        it("handles child reordering via keys", async () => {
            const ref = createRef<Gtk.ListBox>();

            function App({ items }: { items: string[] }) {
                return (
                    <ListBox ref={ref}>
                        {items.map((item) => (
                            <Label key={item} label={item} />
                        ))}
                    </ListBox>
                );
            }

            await render(<App items={["A", "B", "C"]} />, { wrapper: false });

            await render(<App items={["C", "B", "A"]} />, { wrapper: false });

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["C", "B", "A"]);
        });
    });
});
