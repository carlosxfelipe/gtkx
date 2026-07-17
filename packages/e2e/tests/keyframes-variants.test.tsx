import { animated } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { screen, waitFor } from "@gtkx/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "./helpers/animated-render.js";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("keyframes-variants (1)", () => {
    describe("keyframes", () => {
        it("completes an animation through multiple keyframes", async () => {
            const onComplete = vi.fn();

            await render(
                <animated.GtkLabel
                    animate={{ x: [0, 50, 10] }}
                    transition={{ duration: 0.15 }}
                    onAnimationComplete={onComplete}
                >
                    Keys
                </animated.GtkLabel>,
            );

            await screen.findByText("Keys");

            await waitFor(() => expect(onComplete).toHaveBeenCalled(), { timeout: 2000 });
        });
    });
});

describe("keyframes-variants (2)", () => {
    describe("variants with stagger", () => {
        it("completes staggered child animations driven by parent variants", async () => {
            const firstComplete = vi.fn();
            const secondComplete = vi.fn();
            const parentVariants = {
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
            };
            const childVariants = {
                hidden: { opacity: 0 },
                visible: { opacity: 1 },
            };

            await render(
                <animated.GtkBox variants={parentVariants} initial="hidden" animate="visible">
                    <animated.GtkLabel
                        variants={childVariants}
                        transition={{ duration: 0.05 }}
                        onAnimationComplete={firstComplete}
                    >
                        First
                    </animated.GtkLabel>
                    <animated.GtkLabel
                        variants={childVariants}
                        transition={{ duration: 0.05 }}
                        onAnimationComplete={secondComplete}
                    >
                        Second
                    </animated.GtkLabel>
                </animated.GtkBox>,
            );

            await screen.findByText("First");
            await screen.findByText("Second");

            await waitFor(() => expect(firstComplete).toHaveBeenCalled(), { timeout: 3000 });
            await waitFor(() => expect(secondComplete).toHaveBeenCalled(), { timeout: 3000 });
        });
    });
});

describe("keyframes-variants (3)", () => {
    describe("color animation", () => {
        it("animates backgroundColor and loads it into the style sheet", async () => {
            const onComplete = vi.fn();
            const sheetLoads = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");

            await render(
                <animated.GtkBox
                    initial={{ backgroundColor: "#0000ff" }}
                    animate={{ backgroundColor: "#ff0000" }}
                    transition={{ duration: 0.05 }}
                    onAnimationComplete={onComplete}
                >
                    <GtkLabel>Colored</GtkLabel>
                </animated.GtkBox>,
            );

            await screen.findByText("Colored");

            await waitFor(() => expect(onComplete).toHaveBeenCalled(), { timeout: 2000 });

            const loadedBackgroundColor = sheetLoads.mock.calls.some((call) =>
                String(call[0] ?? "").includes("background-color"),
            );
            expect(loadedBackgroundColor).toBe(true);
        });
    });
});
