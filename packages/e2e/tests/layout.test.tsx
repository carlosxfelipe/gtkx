import { animated } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkLabel } from "@gtkx/jsx/gtk";
import { render as baseRender, screen, waitFor } from "@gtkx/testing";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const render = (element: ReactNode) => baseRender(element, { animations: true });

describe("layout animations", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("animates position changes with the layout prop", async () => {
        const loadSpy = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");
        const onStart = vi.fn();
        const onComplete = vi.fn();
        const view = (shifted: boolean): ReactNode => (
            <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                {shifted ? <GtkBox heightRequest={120} /> : null}
                <animated.GtkBox
                    layout
                    widthRequest={100}
                    heightRequest={40}
                    onLayoutAnimationStart={onStart}
                    onLayoutAnimationComplete={onComplete}
                >
                    <GtkLabel>Layout</GtkLabel>
                </animated.GtkBox>
            </GtkBox>
        );
        const { rerender } = await render(view(false));
        await screen.findByText("Layout");

        rerender(view(true));
        await waitFor(() => expect(onStart).toHaveBeenCalled(), { timeout: 3000 });
        await waitFor(() => expect(onComplete).toHaveBeenCalled(), { timeout: 3000 });

        const sheets = loadSpy.mock.calls.map((call) => String(call[0]));
        expect(sheets.some((css) => css.includes("gtkx-anim") && css.includes("translate"))).toBe(true);
    });

    it("runs a shared element transition between keyed layoutId widgets", async () => {
        const onStart = vi.fn();
        const view = (second: boolean): ReactNode => (
            <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                {second ? (
                    <animated.GtkBox
                        key="b"
                        layoutId="shared"
                        widthRequest={200}
                        heightRequest={80}
                        onLayoutAnimationStart={onStart}
                    >
                        <GtkLabel>Second</GtkLabel>
                    </animated.GtkBox>
                ) : (
                    <animated.GtkBox key="a" layoutId="shared" widthRequest={100} heightRequest={40}>
                        <GtkLabel>First</GtkLabel>
                    </animated.GtkBox>
                )}
            </GtkBox>
        );
        const { rerender } = await render(view(false));
        await screen.findByText("First");

        rerender(view(true));
        await screen.findByText("Second");
        await waitFor(() => expect(onStart).toHaveBeenCalled(), { timeout: 3000 });
    });
});
