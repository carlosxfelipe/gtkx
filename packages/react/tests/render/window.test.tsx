import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef as createNativeRef } from "@gtkx/native";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { AdwApplicationWindow, AdwWindow, ApplicationWindow, Label, Window } from "../../src/index.js";
import { flushMicrotasks, getCurrentApp, render } from "../setup.js";

describe("render - Window", () => {
    describe("creation", () => {
        it("creates Gtk.Window", async () => {
            const ref = createRef<Gtk.Window>();

            render(<Window.Root ref={ref} title="Plain Window" />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getTitle()).toBe("Plain Window");
        });

        it("creates Gtk.ApplicationWindow with current app", async () => {
            const ref = createRef<Gtk.ApplicationWindow>();

            render(<ApplicationWindow ref={ref} title="App Window" />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getApplication()?.id).toEqual(getCurrentApp().id);
        });

        it("creates Adw.Window", async () => {
            const ref = createRef<Adw.Window>();

            render(<AdwWindow.Root ref={ref} />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
        });

        it("creates Adw.ApplicationWindow with current app", async () => {
            const ref = createRef<Adw.ApplicationWindow>();

            render(<AdwApplicationWindow.Root ref={ref} />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getApplication()?.id).toEqual(getCurrentApp().id);
        });
    });

    describe("defaultSize", () => {
        it("sets default size via defaultWidth/defaultHeight", async () => {
            const ref = createRef<Gtk.Window>();

            render(<Window.Root ref={ref} defaultWidth={300} defaultHeight={200} />);
            await flushMicrotasks();

            const widthRef = createNativeRef(0);
            const heightRef = createNativeRef(0);
            ref.current?.getDefaultSize(widthRef, heightRef);
            expect(widthRef.value).toBeGreaterThanOrEqual(300);
            expect(heightRef.value).toBeGreaterThanOrEqual(200);
        });

        it("updates default size when props change", async () => {
            const ref = createRef<Gtk.Window>();

            function App({ width, height }: { width: number; height: number }) {
                return <Window.Root ref={ref} defaultWidth={width} defaultHeight={height} />;
            }

            render(<App width={200} height={150} />);
            await flushMicrotasks();

            const widthRef = createNativeRef(0);
            const heightRef = createNativeRef(0);
            ref.current?.getDefaultSize(widthRef, heightRef);
            const initialWidth = widthRef.value;
            const initialHeight = heightRef.value;

            render(<App width={400} height={300} />);
            await flushMicrotasks();

            ref.current?.getDefaultSize(widthRef, heightRef);
            expect(widthRef.value).toBeGreaterThanOrEqual(initialWidth);
            expect(heightRef.value).toBeGreaterThanOrEqual(initialHeight);
        });

        it("handles partial size (only width)", async () => {
            const ref = createRef<Gtk.Window>();

            render(<Window.Root ref={ref} defaultWidth={300} />);
            await flushMicrotasks();

            const widthRef = createNativeRef(0);
            ref.current?.getDefaultSize(widthRef, null);
            expect(widthRef.value).toBeGreaterThanOrEqual(300);
        });

        it("handles partial size (only height)", async () => {
            const ref = createRef<Gtk.Window>();

            render(<Window.Root ref={ref} defaultHeight={200} />);
            await flushMicrotasks();

            const heightRef = createNativeRef(0);
            ref.current?.getDefaultSize(null, heightRef);
            expect(heightRef.value).toBeGreaterThanOrEqual(200);
        });
    });

    describe("lifecycle", () => {
        it("presents window on mount", async () => {
            const ref = createRef<Gtk.Window>();

            render(<Window.Root ref={ref} title="Present" />);
            await flushMicrotasks();

            expect(ref.current?.getVisible()).toBe(true);
        });

        it("destroys window on unmount", async () => {
            const ref = createRef<Gtk.Window>();

            function App({ show }: { show: boolean }) {
                return show ? <Window.Root ref={ref} title="Destroy" /> : null;
            }

            render(<App show={true} />);
            await flushMicrotasks();

            const windowId = ref.current?.id;
            expect(windowId).toBeDefined();

            render(<App show={false} />);
            await flushMicrotasks();
        });
    });

    describe("children", () => {
        it("sets child widget", async () => {
            const windowRef = createRef<Gtk.Window>();
            const labelRef = createRef<Gtk.Label>();

            render(
                <Window.Root ref={windowRef}>
                    <Label ref={labelRef} label="Window Child" />
                </Window.Root>,
            );
            await flushMicrotasks();

            expect(windowRef.current?.getChild()?.id).toEqual(labelRef.current?.id);
        });

        it("replaces child widget", async () => {
            const windowRef = createRef<Gtk.Window>();
            const label1Ref = createRef<Gtk.Label>();
            const label2Ref = createRef<Gtk.Label>();

            function App({ first }: { first: boolean }) {
                return (
                    <Window.Root ref={windowRef}>
                        {first ? (
                            <Label ref={label1Ref} key="first" label="First" />
                        ) : (
                            <Label ref={label2Ref} key="second" label="Second" />
                        )}
                    </Window.Root>
                );
            }

            render(<App first={true} />);
            await flushMicrotasks();

            expect(windowRef.current?.getChild()?.id).toEqual(label1Ref.current?.id);

            render(<App first={false} />);
            await flushMicrotasks();

            expect(windowRef.current?.getChild()?.id).toEqual(label2Ref.current?.id);
        });
    });
});
