import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Label, ListBox } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

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
    describe("append", () => {
        it("appends child widgets", async () => {
            const ref = createRef<Gtk.ListBox>();

            render(
                <ListBox ref={ref}>
                    <Label label="First" />
                    <Label label="Second" />
                </ListBox>,
            );
            await flushMicrotasks();

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["First", "Second"]);
        });

        it("maintains correct order", async () => {
            const ref = createRef<Gtk.ListBox>();

            render(
                <ListBox ref={ref}>
                    <Label label="A" />
                    <Label label="B" />
                    <Label label="C" />
                </ListBox>,
            );
            await flushMicrotasks();

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["A", "B", "C"]);
        });
    });

    describe("insert", () => {
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

            render(<App items={["A", "C"]} />);
            await flushMicrotasks();

            render(<App items={["A", "B", "C"]} />);
            await flushMicrotasks();

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["A", "B", "C"]);
        });

        it("uses ListBoxRow index for positioning", async () => {
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

            render(<App items={["First", "Last"]} />);
            await flushMicrotasks();

            render(<App items={["First", "Middle", "Last"]} />);
            await flushMicrotasks();

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["First", "Middle", "Last"]);
        });
    });

    describe("remove", () => {
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

            render(<App items={["A", "B", "C"]} />);
            await flushMicrotasks();

            render(<App items={["A", "C"]} />);
            await flushMicrotasks();

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["A", "C"]);
        });
    });

    describe("reorder", () => {
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

            render(<App items={["A", "B", "C"]} />);
            await flushMicrotasks();

            render(<App items={["C", "B", "A"]} />);
            await flushMicrotasks();

            const labels = getRowLabels(ref.current as Gtk.ListBox);
            expect(labels).toEqual(["C", "B", "A"]);
        });
    });
});
