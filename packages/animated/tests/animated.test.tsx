import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkLabel } from "@gtkx/jsx/gtk";
import { render as baseRender, screen, waitFor } from "@gtkx/testing";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnimatePresence, animated } from "../src/index.js";

const render = (element: ReactNode) => baseRender(element, { animations: true });

describe("animated components", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("memoizes wrappers per component and per intrinsic name", () => {
        const Component = (): null => null;
        expect(animated.create(Component)).toBe(animated.create(Component));
        expect(animated.GtkLabel).toBe(animated.GtkLabel);
        expect(animated.GtkLabel).not.toBe(animated.GtkButton);
    });

    it("runs an enter animation through the CSS sheet", async () => {
        const loadSpy = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");
        const onStart = vi.fn();
        const onComplete = vi.fn();
        await render(
            <animated.GtkLabel
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                onAnimationStart={onStart}
                onAnimationComplete={onComplete}
            >
                Enter
            </animated.GtkLabel>,
        );
        await screen.findByText("Enter");
        await waitFor(() => expect(onComplete).toHaveBeenCalled(), { timeout: 2000 });
        expect(onStart).toHaveBeenCalled();
        const sheets = loadSpy.mock.calls.map((call) => String(call[0]));
        expect(sheets.some((css) => css.includes("gtkx-anim") && css.includes("opacity"))).toBe(true);
    });

    it("animates when the animate prop changes", async () => {
        const onComplete = vi.fn();
        const view = (x: number): ReactNode => (
            <animated.GtkLabel animate={{ x }} transition={{ duration: 0.05 }} onAnimationComplete={onComplete}>
                Move
            </animated.GtkLabel>
        );
        const { rerender } = await render(view(0));
        await screen.findByText("Move");
        rerender(view(40));
        await waitFor(() => expect(onComplete).toHaveBeenCalled(), { timeout: 2000 });
    });

    it("propagates variants from parent to child", async () => {
        const onComplete = vi.fn();
        const parentVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
        const childVariants = { hidden: { x: -10 }, visible: { x: 0 } };
        await render(
            <animated.GtkBox initial="hidden" animate="visible" variants={parentVariants}>
                <animated.GtkLabel
                    variants={childVariants}
                    transition={{ duration: 0.05 }}
                    onAnimationComplete={onComplete}
                >
                    Child
                </animated.GtkLabel>
            </animated.GtkBox>,
        );
        await screen.findByText("Child");
        await waitFor(() => expect(onComplete).toHaveBeenCalled(), { timeout: 2000 });
    });

    it("plays exit animations before AnimatePresence removes a child", async () => {
        const onExitComplete = vi.fn();
        const view = (show: boolean): ReactNode => (
            <GtkBox>
                <AnimatePresence onExitComplete={onExitComplete}>
                    {show ? (
                        <animated.GtkLabel
                            key="toast"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.05 }}
                        >
                            Toast
                        </animated.GtkLabel>
                    ) : null}
                </AnimatePresence>
                <GtkLabel>Anchor</GtkLabel>
            </GtkBox>
        );
        const { rerender } = await render(view(true));
        await screen.findByText("Toast");
        rerender(view(false));
        await waitFor(() => expect(onExitComplete).toHaveBeenCalledTimes(1), { timeout: 2000 });
        await waitFor(() => expect(screen.queryByText("Toast")).toBeNull());
    });

    it("removes exiting children promptly when animations are disabled", async () => {
        const view = (show: boolean): ReactNode => (
            <GtkBox>
                <AnimatePresence>
                    {show ? (
                        <animated.GtkLabel key="gone" exit={{ opacity: 0, transition: { duration: 5 } }}>
                            Gone
                        </animated.GtkLabel>
                    ) : null}
                </AnimatePresence>
                <GtkLabel>Stay</GtkLabel>
            </GtkBox>
        );
        const { rerender } = await baseRender(view(true));
        await screen.findByText("Gone");
        rerender(view(false));
        await waitFor(() => expect(screen.queryByText("Gone")).toBeNull(), { timeout: 2000 });
        expect(screen.queryByText("Stay")).not.toBeNull();
    });
});
