import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { AdwHeaderBar, AdwToolbarView, GtkLabel, Toolbar } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ToolbarChild", () => {
    describe("ToolbarChildNode", () => {
        it("adds child to top bar via Toolbar.Top", async () => {
            const toolbarRef = createRef<Adw.ToolbarView>();
            const contentRef = createRef<Gtk.Label>();

            await render(
                <AdwToolbarView ref={toolbarRef}>
                    <Toolbar.Top>
                        <AdwHeaderBar />
                    </Toolbar.Top>
                    <GtkLabel ref={contentRef} label="Content" />
                </AdwToolbarView>,
                { wrapper: false },
            );

            expect(contentRef.current).not.toBeNull();
            expect(toolbarRef.current?.getContent()).not.toBeNull();
        });

        it("adds child to bottom bar via Toolbar.Bottom", async () => {
            const toolbarRef = createRef<Adw.ToolbarView>();
            const contentRef = createRef<Gtk.Label>();

            await render(
                <AdwToolbarView ref={toolbarRef}>
                    <GtkLabel ref={contentRef} label="Content" />
                    <Toolbar.Bottom>
                        <AdwHeaderBar />
                    </Toolbar.Bottom>
                </AdwToolbarView>,
                { wrapper: false },
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
                    <Toolbar.Top>
                        <AdwHeaderBar />
                    </Toolbar.Top>
                    <Toolbar.Top>
                        <GtkLabel ref={secondTopRef} label="Second Top Bar" />
                    </Toolbar.Top>
                    <GtkLabel ref={contentRef} label="Content" />
                </AdwToolbarView>,
                { wrapper: false },
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
                            <Toolbar.Top>
                                <AdwHeaderBar />
                            </Toolbar.Top>
                        )}
                        <GtkLabel ref={contentRef} label="Content" />
                    </AdwToolbarView>
                );
            }

            await render(<App showTop={false} />, { wrapper: false });
            await render(<App showTop={true} />, { wrapper: false });

            expect(contentRef.current).not.toBeNull();
            expect(toolbarRef.current?.getContent()).not.toBeNull();
        });
    });
});
