import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkLabel, Pack } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - PackChild", () => {
    describe("PackChild (Pack.Start/Pack.End)", () => {
        it("packs child at start via Pack.Start", async () => {
            const boxRef = createRef<Gtk.Box>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkBox ref={boxRef}>
                    <Pack.Start>
                        <GtkLabel ref={labelRef} label="Start" />
                    </Pack.Start>
                </GtkBox>,
                { wrapper: false },
            );

            expect(boxRef.current?.getFirstChild()?.id).toBe(labelRef.current?.id);
        });

        it("packs child at end via Pack.End", async () => {
            const boxRef = createRef<Gtk.Box>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkBox ref={boxRef}>
                    <Pack.End>
                        <GtkLabel ref={labelRef} label="End" />
                    </Pack.End>
                </GtkBox>,
                { wrapper: false },
            );

            expect(boxRef.current?.getLastChild()?.id).toBe(labelRef.current?.id);
        });

        it("combines Pack.Start and Pack.End", async () => {
            const boxRef = createRef<Gtk.Box>();
            const startRef = createRef<Gtk.Label>();
            const endRef = createRef<Gtk.Label>();

            await render(
                <GtkBox ref={boxRef}>
                    <Pack.Start>
                        <GtkLabel ref={startRef} label="Start" />
                    </Pack.Start>
                    <Pack.End>
                        <GtkLabel ref={endRef} label="End" />
                    </Pack.End>
                </GtkBox>,
                { wrapper: false },
            );

            expect(boxRef.current?.getFirstChild()?.id).toBe(startRef.current?.id);
            expect(boxRef.current?.getLastChild()?.id).toBe(endRef.current?.id);
        });

        it("removes packed child", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ showStart }: { showStart: boolean }) {
                return (
                    <GtkBox ref={boxRef}>
                        {showStart && (
                            <Pack.Start>
                                <GtkLabel label="Start" />
                            </Pack.Start>
                        )}
                        <GtkLabel label="Always" />
                    </GtkBox>
                );
            }

            await render(<App showStart={true} />, { wrapper: false });

            let childCount = 0;
            let child = boxRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(2);

            await render(<App showStart={false} />, { wrapper: false });

            childCount = 0;
            child = boxRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(1);
        });

        it("packs multiple children at start via Pack.Start", async () => {
            const boxRef = createRef<Gtk.Box>();

            await render(
                <GtkBox ref={boxRef}>
                    <Pack.Start>
                        <GtkLabel label="First" />
                        <GtkLabel label="Second" />
                    </Pack.Start>
                </GtkBox>,
                { wrapper: false },
            );

            let childCount = 0;
            let child = boxRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(2);
        });

        it("packs multiple children at end via Pack.End", async () => {
            const boxRef = createRef<Gtk.Box>();

            await render(
                <GtkBox ref={boxRef}>
                    <Pack.End>
                        <GtkLabel label="First" />
                        <GtkLabel label="Second" />
                    </Pack.End>
                </GtkBox>,
                { wrapper: false },
            );

            let childCount = 0;
            let child = boxRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(2);
        });

        it("removes individual children from Pack.Start", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ showSecond }: { showSecond: boolean }) {
                return (
                    <GtkBox ref={boxRef}>
                        <Pack.Start>
                            <GtkLabel label="First" />
                            {showSecond && <GtkLabel label="Second" />}
                        </Pack.Start>
                    </GtkBox>
                );
            }

            await render(<App showSecond={true} />, { wrapper: false });

            let childCount = 0;
            let child = boxRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(2);

            await render(<App showSecond={false} />, { wrapper: false });

            childCount = 0;
            child = boxRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(1);
        });
    });
});
