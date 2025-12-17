import * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Box, Frame, Label, Window } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

const getChildWidgets = (parent: Gtk.Widget): Gtk.Widget[] => {
    const children: Gtk.Widget[] = [];
    let child = parent.getFirstChild();
    while (child) {
        children.push(child);
        child = child.getNextSibling();
    }
    return children;
};

const getChildLabels = (parent: Gtk.Widget): string[] => {
    return getChildWidgets(parent)
        .filter((w): w is Gtk.Label => "getLabel" in w && typeof w.getLabel === "function")
        .map((l) => l.getLabel() ?? "");
};

describe("render - children", () => {
    describe("appendChild", () => {
        it("appends child to appendable widget (Box)", async () => {
            const boxRef = createRef<Gtk.Box>();
            const labelRef = createRef<Gtk.Label>();

            render(
                <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                    <Label ref={labelRef} label="Child" />
                </Box>,
            );
            await flushMicrotasks();

            expect(labelRef.current?.getParent()?.id).toEqual(boxRef.current?.id);
        });

        it("sets child on single-child widget", async () => {
            const frameRef = createRef<Gtk.Frame>();
            const labelRef = createRef<Gtk.Label>();

            render(
                <Frame.Root ref={frameRef}>
                    <Label ref={labelRef} label="Single Child" />
                </Frame.Root>,
            );
            await flushMicrotasks();

            expect(frameRef.current?.getChild()?.id).toEqual(labelRef.current?.id);
        });
    });

    describe("removeChild", () => {
        it("removes child from parent", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ showChild }: { showChild: boolean }) {
                return (
                    <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                        {showChild && <Label label="Removable" />}
                    </Box>
                );
            }

            render(<App showChild={true} />);
            await flushMicrotasks();

            expect(getChildWidgets(boxRef.current as Gtk.Box).length).toBe(1);

            render(<App showChild={false} />);
            await flushMicrotasks();

            expect(getChildWidgets(boxRef.current as Gtk.Box).length).toBe(0);
        });

        it("clears child on single-child widget", async () => {
            const frameRef = createRef<Gtk.Frame>();

            function App({ showChild }: { showChild: boolean }) {
                return <Frame.Root ref={frameRef}>{showChild && <Label label="Child" />}</Frame.Root>;
            }

            render(<App showChild={true} />);
            await flushMicrotasks();

            expect(frameRef.current?.getChild()).not.toBeNull();

            render(<App showChild={false} />);
            await flushMicrotasks();

            expect(frameRef.current?.getChild()).toBeNull();
        });
    });

    describe("insertBefore", () => {
        it("inserts child before sibling", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ items }: { items: string[] }) {
                return (
                    <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                        {items.map((item) => (
                            <Label key={item} label={item} />
                        ))}
                    </Box>
                );
            }

            render(<App items={["A", "C"]} />);
            await flushMicrotasks();

            expect(getChildLabels(boxRef.current as Gtk.Box)).toEqual(["A", "C"]);

            render(<App items={["A", "B", "C"]} />);
            await flushMicrotasks();

            expect(getChildLabels(boxRef.current as Gtk.Box)).toEqual(["A", "B", "C"]);
        });

        it("falls back to append when before not found", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ items }: { items: string[] }) {
                return (
                    <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                        {items.map((item) => (
                            <Label key={item} label={item} />
                        ))}
                    </Box>
                );
            }

            render(<App items={["A", "B"]} />);
            await flushMicrotasks();

            render(<App items={["A", "B", "C"]} />);
            await flushMicrotasks();

            expect(getChildLabels(boxRef.current as Gtk.Box)).toEqual(["A", "B", "C"]);
        });
    });

    describe("container operations", () => {
        it("appendChildToContainer works with root container", async () => {
            const windowRef = createRef<Gtk.Window>();

            render(<Window.Root ref={windowRef} title="Root Container" />);
            await flushMicrotasks();

            expect(windowRef.current).not.toBeNull();
        });

        it("removeChildFromContainer works with root container", async () => {
            const windowRef = createRef<Gtk.Window>();

            function App({ showWindow }: { showWindow: boolean }) {
                return showWindow ? <Window.Root ref={windowRef} title="Window" /> : null;
            }

            render(<App showWindow={true} />);
            await flushMicrotasks();

            expect(windowRef.current).not.toBeNull();

            render(<App showWindow={false} />);
            await flushMicrotasks();
        });

        it("insertInContainerBefore works with root container", async () => {
            const window1Ref = createRef<Gtk.Window>();
            const window2Ref = createRef<Gtk.Window>();

            function App({ windows }: { windows: string[] }) {
                return (
                    <>
                        {windows.map((title, i) => (
                            <Window.Root key={title} ref={i === 0 ? window1Ref : window2Ref} title={title} />
                        ))}
                    </>
                );
            }

            render(<App windows={["First"]} />);
            await flushMicrotasks();

            render(<App windows={["Second", "First"]} />);
            await flushMicrotasks();
        });
    });

    describe("child ordering", () => {
        it("maintains correct order after multiple operations", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ items }: { items: string[] }) {
                return (
                    <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                        {items.map((item) => (
                            <Label key={item} label={item} />
                        ))}
                    </Box>
                );
            }

            render(<App items={["A", "B", "C"]} />);
            await flushMicrotasks();
            expect(getChildLabels(boxRef.current as Gtk.Box)).toEqual(["A", "B", "C"]);

            render(<App items={["A", "D", "B", "C"]} />);
            await flushMicrotasks();
            expect(getChildLabels(boxRef.current as Gtk.Box)).toEqual(["A", "D", "B", "C"]);

            render(<App items={["D", "C"]} />);
            await flushMicrotasks();
            expect(getChildLabels(boxRef.current as Gtk.Box)).toEqual(["D", "C"]);
        });

        it("handles reordering via key changes", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ items }: { items: string[] }) {
                return (
                    <Box ref={boxRef} spacing={0} orientation={Gtk.Orientation.VERTICAL}>
                        {items.map((item) => (
                            <Label key={item} label={item} />
                        ))}
                    </Box>
                );
            }

            render(<App items={["A", "B", "C"]} />);
            await flushMicrotasks();
            expect(getChildLabels(boxRef.current as Gtk.Box)).toEqual(["A", "B", "C"]);

            render(<App items={["C", "B", "A"]} />);
            await flushMicrotasks();
            expect(getChildLabels(boxRef.current as Gtk.Box)).toEqual(["C", "B", "A"]);
        });
    });
});
