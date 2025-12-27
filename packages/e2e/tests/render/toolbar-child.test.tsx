import type * as Adw from "@gtkx/ffi/adw";
import { AdwHeaderBar, AdwToolbarView, GtkLabel, Toolbar } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ToolbarChild", () => {
    describe("ToolbarChildNode", () => {
        it("adds child to top bar via Toolbar.Top", async () => {
            const toolbarRef = createRef<Adw.ToolbarView>();

            await render(
                <AdwToolbarView ref={toolbarRef}>
                    <Toolbar.Top>
                        <AdwHeaderBar />
                    </Toolbar.Top>
                    <GtkLabel label="Content" />
                </AdwToolbarView>,
                { wrapper: false },
            );

            expect(toolbarRef.current?.getTopBarHeight()).toBeGreaterThan(0);
        });

        it("adds child to bottom bar via Toolbar.Bottom", async () => {
            const toolbarRef = createRef<Adw.ToolbarView>();

            await render(
                <AdwToolbarView ref={toolbarRef}>
                    <GtkLabel label="Content" />
                    <Toolbar.Bottom>
                        <AdwHeaderBar />
                    </Toolbar.Bottom>
                </AdwToolbarView>,
                { wrapper: false },
            );

            expect(toolbarRef.current?.getBottomBarHeight()).toBeGreaterThan(0);
        });

        it("handles multiple top bars", async () => {
            const toolbarRef = createRef<Adw.ToolbarView>();

            await render(
                <AdwToolbarView ref={toolbarRef}>
                    <Toolbar.Top>
                        <AdwHeaderBar />
                    </Toolbar.Top>
                    <Toolbar.Top>
                        <GtkLabel label="Second Top Bar" />
                    </Toolbar.Top>
                    <GtkLabel label="Content" />
                </AdwToolbarView>,
                { wrapper: false },
            );

            expect(toolbarRef.current?.getTopBarHeight()).toBeGreaterThan(0);
        });

        it("handles dynamic toolbar addition", async () => {
            const toolbarRef = createRef<Adw.ToolbarView>();

            function App({ showTop }: { showTop: boolean }) {
                return (
                    <AdwToolbarView ref={toolbarRef}>
                        {showTop && (
                            <Toolbar.Top>
                                <AdwHeaderBar />
                            </Toolbar.Top>
                        )}
                        <GtkLabel label="Content" />
                    </AdwToolbarView>
                );
            }

            await render(<App showTop={false} />, { wrapper: false });
            await render(<App showTop={true} />, { wrapper: false });

            expect(toolbarRef.current?.getTopBarHeight()).toBeGreaterThan(0);
        });
    });
});
