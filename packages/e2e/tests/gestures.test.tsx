import { animated } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { fireEvent, screen, userEvent, waitFor } from "@gtkx/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "./helpers/animated-render.js";

afterEach(() => {
    vi.restoreAllMocks();
});

const captureWidget = () => {
    const holder: { widget: Gtk.Widget | null } = { widget: null };
    return {
        ref: (widget: Gtk.Widget | null): void => {
            holder.widget = widget;
        },
        get: (): Gtk.Widget => {
            if (!holder.widget) throw new Error("widget ref was not attached");
            return holder.widget;
        },
    };
};

const animClassOf = (widget: Gtk.Widget): string => {
    const className = widget.getCssClasses().find((candidate) => candidate.startsWith("gtkx-anim-"));
    if (!className) throw new Error("widget has no gtkx-anim CSS class");
    return className;
};

const spyOnSheetLoads = () => vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");

type SheetSpy = ReturnType<typeof spyOnSheetLoads>;

const currentRuleFor = (spy: SheetSpy, className: string): string | null => {
    for (let i = spy.mock.calls.length - 1; i >= 0; i--) {
        const css = String(spy.mock.calls[i]?.[0] ?? "");
        const match = css.match(new RegExp(`\\.${className} \\{([^}]*)\\}`));
        if (match?.[1] !== undefined) return match[1];
    }
    return null;
};

describe("gestures (1)", () => {
    describe("whileHover", () => {
        it("animates on hover, fires hover callbacks and settles back on unhover", async () => {
            const onHoverStart = vi.fn();
            const onHoverEnd = vi.fn();
            const button = captureWidget();

            await render(
                <animated.GtkButton
                    ref={button.ref}
                    label="Hover"
                    whileHover={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.05 }}
                    onHoverStart={onHoverStart}
                    onHoverEnd={onHoverEnd}
                />,
            );

            await screen.findByText("Hover");
            const widget = button.get();
            const className = animClassOf(widget);
            const sheetLoads = spyOnSheetLoads();

            await userEvent.hover(widget);

            await waitFor(() => expect(onHoverStart).toHaveBeenCalledTimes(1));
            await waitFor(() => expect(currentRuleFor(sheetLoads, className)).toContain("opacity: 0.5"), {
                timeout: 2000,
            });

            await userEvent.unhover(widget);

            await waitFor(() => expect(onHoverEnd).toHaveBeenCalledTimes(1));
            await waitFor(() => expect(currentRuleFor(sheetLoads, className)).toContain("opacity: 1"), {
                timeout: 2000,
            });
        });
    });
});

describe("gestures (2)", () => {
    describe("whileTap", () => {
        it("fires onTapStart and onTap without onTapCancel on a full click", async () => {
            const onTapStart = vi.fn();
            const onTap = vi.fn();
            const onTapCancel = vi.fn();
            const button = captureWidget();

            await render(
                <animated.GtkButton
                    ref={button.ref}
                    label="Tap"
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.05 }}
                    onTapStart={onTapStart}
                    onTap={onTap}
                    onTapCancel={onTapCancel}
                />,
            );

            await screen.findByText("Tap");

            await userEvent.click(button.get());

            await waitFor(() => expect(onTapStart).toHaveBeenCalledTimes(1));
            await waitFor(() => expect(onTap).toHaveBeenCalledTimes(1));
            expect(onTapCancel).not.toHaveBeenCalled();
        });
    });
});

describe("gestures (3)", () => {
    describe("whileFocus", () => {
        const focusControllersOf = (widget: Gtk.Widget): Gtk.EventControllerFocus[] => {
            const controllers = widget.observeControllers();
            const matches: Gtk.EventControllerFocus[] = [];
            for (let i = 0; i < controllers.getNItems(); i++) {
                const controller = controllers.getItem(i);
                if (controller instanceof Gtk.EventControllerFocus) matches.push(controller);
            }
            return matches;
        };

        it("animates while focused and settles back when focus leaves", async () => {
            const button = captureWidget();

            await render(
                <animated.GtkButton
                    ref={button.ref}
                    label="Focus"
                    whileFocus={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.05 }}
                />,
            );

            await screen.findByText("Focus");
            const widget = button.get();
            const className = animClassOf(widget);

            const root = widget.getRoot();
            if (!(root instanceof Gtk.Window)) throw new Error("widget is not inside a window");
            root.setFocusVisible(true);

            const controllers = focusControllersOf(widget);
            expect(controllers.length).toBeGreaterThan(0);
            const sheetLoads = spyOnSheetLoads();

            for (const controller of controllers) {
                await fireEvent(controller, "enter");
            }

            await waitFor(() => expect(currentRuleFor(sheetLoads, className)).toContain("opacity: 0.6"), {
                timeout: 2000,
            });

            for (const controller of controllers) {
                await fireEvent(controller, "leave");
            }

            await waitFor(() => expect(currentRuleFor(sheetLoads, className)).toContain("opacity: 1"), {
                timeout: 2000,
            });
        });
    });
});
