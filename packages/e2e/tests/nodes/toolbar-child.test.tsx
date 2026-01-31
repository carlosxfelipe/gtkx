import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { AdwHeaderBar, AdwToolbarView, GtkLabel, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ToolbarChild", () => {
    describe("ContainerSlot (ToolbarView)", () => {
        it("adds child to top bar via addTopBar", async () => {
            const toolbarRef = createRef<Adw.ToolbarView>();
            const contentRef = createRef<Gtk.Label>();

            await render(
                <AdwToolbarView ref={toolbarRef}>
                    <x.ContainerSlot for={AdwToolbarView} id="addTopBar">
                        <AdwHeaderBar />
                    </x.ContainerSlot>
                    <GtkLabel ref={contentRef} label="Content" />
                </AdwToolbarView>,
            );

            expect(contentRef.current).not.toBeNull();
            expect(toolbarRef.current?.getContent()).not.toBeNull();
        });

        it("adds child to bottom bar via addBottomBar", async () => {
            const toolbarRef = createRef<Adw.ToolbarView>();
            const contentRef = createRef<Gtk.Label>();

            await render(
                <AdwToolbarView ref={toolbarRef}>
                    <GtkLabel ref={contentRef} label="Content" />
                    <x.ContainerSlot for={AdwToolbarView} id="addBottomBar">
                        <AdwHeaderBar />
                    </x.ContainerSlot>
                </AdwToolbarView>,
            );

            expect(contentRef.current).not.toBeNull();
            expect(toolbarRef.current?.getContent()).not.toBeNull();
        });

        it("handles multiple top bars", async () => {
            const toolbarRef = createRef<Adw.ToolbarView>();
            const secondTopRef = createRef<Gtk.Label>();
            const contentRef = createRef<Gtk.Label>();

            await render(
                <AdwToolbarView ref={toolbarRef}>
                    <x.ContainerSlot for={AdwToolbarView} id="addTopBar">
                        <AdwHeaderBar />
                    </x.ContainerSlot>
                    <x.ContainerSlot for={AdwToolbarView} id="addTopBar">
                        <GtkLabel ref={secondTopRef} label="Second Top Bar" />
                    </x.ContainerSlot>
                    <GtkLabel ref={contentRef} label="Content" />
                </AdwToolbarView>,
            );

            expect(secondTopRef.current).not.toBeNull();
            expect(contentRef.current).not.toBeNull();
        });

        it("handles dynamic toolbar addition", async () => {
            const toolbarRef = createRef<Adw.ToolbarView>();
            const contentRef = createRef<Gtk.Label>();

            function App({ showTop }: { showTop: boolean }) {
                return (
                    <AdwToolbarView ref={toolbarRef}>
                        {showTop && (
                            <x.ContainerSlot for={AdwToolbarView} id="addTopBar">
                                <AdwHeaderBar />
                            </x.ContainerSlot>
                        )}
                        <GtkLabel ref={contentRef} label="Content" />
                    </AdwToolbarView>
                );
            }

            await render(<App showTop={false} />);
            await render(<App showTop={true} />);

            expect(contentRef.current).not.toBeNull();
            expect(toolbarRef.current?.getContent()).not.toBeNull();
        });
    });
});
