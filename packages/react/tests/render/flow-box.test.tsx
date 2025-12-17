import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { FlowBox, Label } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

const getFlowBoxChildLabels = (flowBox: Gtk.FlowBox): string[] => {
    const labels: string[] = [];
    let child = flowBox.getChildAtIndex(0);
    let index = 0;
    while (child) {
        const innerChild = child.getChild();
        if (innerChild && "getLabel" in innerChild && typeof innerChild.getLabel === "function") {
            labels.push((innerChild as Gtk.Label).getLabel() ?? "");
        }
        index++;
        child = flowBox.getChildAtIndex(index);
    }
    return labels;
};

describe("render - FlowBox", () => {
    describe("append", () => {
        it("appends child widgets", async () => {
            const ref = createRef<Gtk.FlowBox>();

            render(
                <FlowBox ref={ref}>
                    <Label label="First" />
                    <Label label="Second" />
                </FlowBox>,
            );
            await flushMicrotasks();

            const labels = getFlowBoxChildLabels(ref.current as Gtk.FlowBox);
            expect(labels).toEqual(["First", "Second"]);
        });
    });

    describe("insert", () => {
        it("inserts child at correct position", async () => {
            const ref = createRef<Gtk.FlowBox>();

            function App({ items }: { items: string[] }) {
                return (
                    <FlowBox ref={ref}>
                        {items.map((item) => (
                            <Label key={item} label={item} />
                        ))}
                    </FlowBox>
                );
            }

            render(<App items={["A", "C"]} />);
            await flushMicrotasks();

            render(<App items={["A", "B", "C"]} />);
            await flushMicrotasks();

            const labels = getFlowBoxChildLabels(ref.current as Gtk.FlowBox);
            expect(labels).toEqual(["A", "B", "C"]);
        });

        it("uses FlowBoxChild index for positioning", async () => {
            const ref = createRef<Gtk.FlowBox>();

            function App({ items }: { items: string[] }) {
                return (
                    <FlowBox ref={ref}>
                        {items.map((item) => (
                            <Label key={item} label={item} />
                        ))}
                    </FlowBox>
                );
            }

            render(<App items={["First", "Last"]} />);
            await flushMicrotasks();

            render(<App items={["First", "Middle", "Last"]} />);
            await flushMicrotasks();

            const labels = getFlowBoxChildLabels(ref.current as Gtk.FlowBox);
            expect(labels).toEqual(["First", "Middle", "Last"]);
        });
    });

    describe("remove", () => {
        it("removes FlowBoxChild wrapper", async () => {
            const ref = createRef<Gtk.FlowBox>();

            function App({ items }: { items: string[] }) {
                return (
                    <FlowBox ref={ref}>
                        {items.map((item) => (
                            <Label key={item} label={item} />
                        ))}
                    </FlowBox>
                );
            }

            render(<App items={["A", "B", "C"]} />);
            await flushMicrotasks();

            render(<App items={["A", "C"]} />);
            await flushMicrotasks();

            const labels = getFlowBoxChildLabels(ref.current as Gtk.FlowBox);
            expect(labels).toEqual(["A", "C"]);
        });
    });
});
