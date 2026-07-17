import { animated } from "@gtkx/animated";
import type * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton } from "@gtkx/jsx/gtk";
import { screen, waitFor } from "@gtkx/testing";
import { describe, expect, it, vi } from "vitest";
import { render } from "./helpers/animated-render.js";

describe("animated (inline ref)", () => {
    it("completes an animation across re-renders with an inline function ref", async () => {
        const onStart = vi.fn();
        const onComplete = vi.fn();
        let captured: Gtk.Widget | null = null;

        function App({ tick }: { tick: number }) {
            return (
                <GtkBox>
                    <GtkButton label={`tick-${tick}`} />
                    <animated.GtkLabel
                        ref={(widget: Gtk.Widget | null) => {
                            captured = widget;
                        }}
                        label="Inline Ref"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        onAnimationStart={onStart}
                        onAnimationComplete={onComplete}
                    />
                </GtkBox>
            );
        }

        const { rerender } = await render(<App tick={0} />);
        await screen.findByText("Inline Ref");
        await waitFor(() => expect(onStart).toHaveBeenCalled());

        await rerender(<App tick={1} />);
        await rerender(<App tick={2} />);
        await rerender(<App tick={3} />);

        await waitFor(() => expect(onComplete).toHaveBeenCalled(), { timeout: 2000 });
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(captured).not.toBeNull();
    });
});
