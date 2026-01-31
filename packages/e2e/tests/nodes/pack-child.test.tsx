import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkHeaderBar, GtkLabel, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - PackChild", () => {
    describe("ContainerSlot (packStart/packEnd)", () => {
        it("packs child at start via packStart", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const startRef = createRef<Gtk.Label>();

            await render(
                <GtkHeaderBar ref={headerBarRef}>
                    <x.ContainerSlot for={GtkHeaderBar} id="packStart">
                        <GtkLabel ref={startRef} label="Start" />
                    </x.ContainerSlot>
                </GtkHeaderBar>,
            );

            expect(startRef.current).not.toBeNull();
            expect(startRef.current?.getLabel()).toBe("Start");
        });

        it("packs child at end via packEnd", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const endRef = createRef<Gtk.Label>();

            await render(
                <GtkHeaderBar ref={headerBarRef}>
                    <x.ContainerSlot for={GtkHeaderBar} id="packEnd">
                        <GtkLabel ref={endRef} label="End" />
                    </x.ContainerSlot>
                </GtkHeaderBar>,
            );

            expect(endRef.current).not.toBeNull();
            expect(endRef.current?.getLabel()).toBe("End");
        });

        it("combines packStart and packEnd", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const startRef = createRef<Gtk.Label>();
            const endRef = createRef<Gtk.Label>();

            await render(
                <GtkHeaderBar ref={headerBarRef}>
                    <x.ContainerSlot for={GtkHeaderBar} id="packStart">
                        <GtkLabel ref={startRef} label="Start" />
                    </x.ContainerSlot>
                    <x.ContainerSlot for={GtkHeaderBar} id="packEnd">
                        <GtkLabel ref={endRef} label="End" />
                    </x.ContainerSlot>
                </GtkHeaderBar>,
            );

            expect(startRef.current).not.toBeNull();
            expect(endRef.current).not.toBeNull();
        });

        it("removes packed child", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const startRef = createRef<Gtk.Label>();
            const alwaysRef = createRef<Gtk.Label>();

            function App({ showStart }: { showStart: boolean }) {
                return (
                    <GtkHeaderBar ref={headerBarRef}>
                        {showStart && (
                            <x.ContainerSlot for={GtkHeaderBar} id="packStart">
                                <GtkLabel ref={startRef} label="Start" />
                            </x.ContainerSlot>
                        )}
                        <x.Slot for={GtkHeaderBar} id="titleWidget">
                            <GtkLabel ref={alwaysRef} label="Always" />
                        </x.Slot>
                    </GtkHeaderBar>
                );
            }

            await render(<App showStart={true} />);

            expect(startRef.current).not.toBeNull();
            expect(alwaysRef.current).not.toBeNull();

            await render(<App showStart={false} />);

            expect(startRef.current).toBeNull();
            expect(alwaysRef.current).not.toBeNull();
        });

        it("packs multiple children at start via packStart", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            await render(
                <GtkHeaderBar ref={headerBarRef}>
                    <x.ContainerSlot for={GtkHeaderBar} id="packStart">
                        <GtkLabel ref={firstRef} label="First" />
                        <GtkLabel ref={secondRef} label="Second" />
                    </x.ContainerSlot>
                </GtkHeaderBar>,
            );

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();
        });

        it("packs multiple children at end via packEnd", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            await render(
                <GtkHeaderBar ref={headerBarRef}>
                    <x.ContainerSlot for={GtkHeaderBar} id="packEnd">
                        <GtkLabel ref={firstRef} label="First" />
                        <GtkLabel ref={secondRef} label="Second" />
                    </x.ContainerSlot>
                </GtkHeaderBar>,
            );

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();
        });

        it("removes individual children from packStart", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            function App({ showSecond }: { showSecond: boolean }) {
                return (
                    <GtkHeaderBar ref={headerBarRef}>
                        <x.ContainerSlot for={GtkHeaderBar} id="packStart">
                            <GtkLabel ref={firstRef} label="First" />
                            {showSecond && <GtkLabel ref={secondRef} label="Second" />}
                        </x.ContainerSlot>
                    </GtkHeaderBar>
                );
            }

            await render(<App showSecond={true} />);

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();

            await render(<App showSecond={false} />);

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).toBeNull();
        });
    });
});
