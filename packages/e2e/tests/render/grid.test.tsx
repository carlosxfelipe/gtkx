import type * as Gtk from "@gtkx/ffi/gtk";
import { Grid, Label } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - Grid", () => {
    describe("Grid.Root", () => {
        it("creates Grid widget", async () => {
            const ref = createRef<Gtk.Grid>();

            await render(<Grid.Root ref={ref} />, { wrapper: false });

            expect(ref.current).not.toBeNull();
        });
    });

    describe("Grid.Child", () => {
        it("attaches child at column, row position", async () => {
            const gridRef = createRef<Gtk.Grid>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <Grid.Root ref={gridRef}>
                    <Grid.Child column={1} row={2}>
                        <Label ref={labelRef} label="Positioned" />
                    </Grid.Child>
                </Grid.Root>,
                { wrapper: false },
            );

            expect(labelRef.current?.getParent()?.id).toEqual(gridRef.current?.id);
        });

        it("respects columnSpan and rowSpan", async () => {
            const gridRef = createRef<Gtk.Grid>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <Grid.Root ref={gridRef}>
                    <Grid.Child column={0} row={0} columnSpan={2} rowSpan={3}>
                        <Label ref={labelRef} label="Spanning" />
                    </Grid.Child>
                </Grid.Root>,
                { wrapper: false },
            );

            expect(labelRef.current).not.toBeNull();
        });

        it("uses default values for missing props", async () => {
            const gridRef = createRef<Gtk.Grid>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <Grid.Root ref={gridRef}>
                    <Grid.Child>
                        <Label ref={labelRef} label="Default Position" />
                    </Grid.Child>
                </Grid.Root>,
                { wrapper: false },
            );

            expect(labelRef.current?.getParent()?.id).toEqual(gridRef.current?.id);
        });
    });

    describe("position updates", () => {
        it("repositions child when column/row changes", async () => {
            const gridRef = createRef<Gtk.Grid>();
            const labelRef = createRef<Gtk.Label>();

            function App({ column, row }: { column: number; row: number }) {
                return (
                    <Grid.Root ref={gridRef}>
                        <Grid.Child column={column} row={row}>
                            <Label ref={labelRef} label="Moving" />
                        </Grid.Child>
                    </Grid.Root>
                );
            }

            await render(<App column={0} row={0} />, { wrapper: false });

            await render(<App column={2} row={3} />, { wrapper: false });

            expect(labelRef.current?.getParent()?.id).toEqual(gridRef.current?.id);
        });

        it("updates span when columnSpan/rowSpan changes", async () => {
            const gridRef = createRef<Gtk.Grid>();
            const labelRef = createRef<Gtk.Label>();

            function App({ columnSpan, rowSpan }: { columnSpan: number; rowSpan: number }) {
                return (
                    <Grid.Root ref={gridRef}>
                        <Grid.Child column={0} row={0} columnSpan={columnSpan} rowSpan={rowSpan}>
                            <Label ref={labelRef} label="Resizing" />
                        </Grid.Child>
                    </Grid.Root>
                );
            }

            await render(<App columnSpan={1} rowSpan={1} />, { wrapper: false });

            await render(<App columnSpan={3} rowSpan={2} />, { wrapper: false });

            expect(labelRef.current).not.toBeNull();
        });
    });

    describe("removal", () => {
        it("removes child from grid", async () => {
            const gridRef = createRef<Gtk.Grid>();

            function App({ showChild }: { showChild: boolean }) {
                return (
                    <Grid.Root ref={gridRef}>
                        {showChild && (
                            <Grid.Child column={0} row={0}>
                                <Label label="Removable" />
                            </Grid.Child>
                        )}
                    </Grid.Root>
                );
            }

            await render(<App showChild={true} />, { wrapper: false });

            expect(gridRef.current?.getFirstChild()).not.toBeNull();

            await render(<App showChild={false} />, { wrapper: false });

            expect(gridRef.current?.getFirstChild()).toBeNull();
        });
    });
});
