import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Button, Label, Overlay } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

describe("render - Overlay", () => {
    describe("main child", () => {
        it("sets first child as main child via setChild", async () => {
            const overlayRef = createRef<Gtk.Overlay>();
            const labelRef = createRef<Gtk.Label>();

            render(
                <Overlay ref={overlayRef}>
                    <Label ref={labelRef} label="Main Child" />
                </Overlay>,
            );
            await flushMicrotasks();

            expect(overlayRef.current?.getChild()?.id).toEqual(labelRef.current?.id);
        });

        it("clears main child on removal", async () => {
            const overlayRef = createRef<Gtk.Overlay>();

            function App({ showMain }: { showMain: boolean }) {
                return <Overlay ref={overlayRef}>{showMain && <Label label="Main" />}</Overlay>;
            }

            render(<App showMain={true} />);
            await flushMicrotasks();

            expect(overlayRef.current?.getChild()).not.toBeNull();

            render(<App showMain={false} />);
            await flushMicrotasks();

            expect(overlayRef.current?.getChild()).toBeNull();
        });
    });

    describe("overlay children", () => {
        it("adds subsequent children as overlays", async () => {
            const overlayRef = createRef<Gtk.Overlay>();
            const mainRef = createRef<Gtk.Label>();
            const overlay1Ref = createRef<Gtk.Button>();
            const overlay2Ref = createRef<Gtk.Button>();

            render(
                <Overlay ref={overlayRef}>
                    <Label ref={mainRef} label="Main" />
                    <Button ref={overlay1Ref} label="Overlay 1" />
                    <Button ref={overlay2Ref} label="Overlay 2" />
                </Overlay>,
            );
            await flushMicrotasks();

            expect(overlayRef.current?.getChild()?.id).toEqual(mainRef.current?.id);
            expect(overlay1Ref.current?.getParent()?.id).toEqual(overlayRef.current?.id);
            expect(overlay2Ref.current?.getParent()?.id).toEqual(overlayRef.current?.id);
        });

        it("removes overlay children", async () => {
            const overlayRef = createRef<Gtk.Overlay>();

            function App({ overlays }: { overlays: string[] }) {
                return (
                    <Overlay ref={overlayRef}>
                        <Label label="Main" />
                        {overlays.map((label) => (
                            <Button key={label} label={label} />
                        ))}
                    </Overlay>
                );
            }

            render(<App overlays={["A", "B", "C"]} />);
            await flushMicrotasks();

            render(<App overlays={["A", "C"]} />);
            await flushMicrotasks();
        });
    });

    describe("ordering", () => {
        it("inserts before main child becomes overlay", async () => {
            const overlayRef = createRef<Gtk.Overlay>();
            const buttonRef = createRef<Gtk.Button>();
            const labelRef = createRef<Gtk.Label>();

            function App({ insertFirst }: { insertFirst: boolean }) {
                return (
                    <Overlay ref={overlayRef}>
                        {insertFirst && <Button ref={buttonRef} key="button" label="Inserted" />}
                        <Label ref={labelRef} key="label" label="Original Main" />
                    </Overlay>
                );
            }

            render(<App insertFirst={false} />);
            await flushMicrotasks();

            expect(overlayRef.current?.getChild()?.id).toEqual(labelRef.current?.id);

            render(<App insertFirst={true} />);
            await flushMicrotasks();
        });

        it("inserts before overlay at correct position", async () => {
            const overlayRef = createRef<Gtk.Overlay>();

            function App({ overlays }: { overlays: string[] }) {
                return (
                    <Overlay ref={overlayRef}>
                        <Label label="Main" />
                        {overlays.map((label) => (
                            <Button key={label} label={label} />
                        ))}
                    </Overlay>
                );
            }

            render(<App overlays={["First", "Last"]} />);
            await flushMicrotasks();

            render(<App overlays={["First", "Middle", "Last"]} />);
            await flushMicrotasks();
        });
    });
});
