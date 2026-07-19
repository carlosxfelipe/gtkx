import * as Gtk from "@gtkx/gi/gtk";
import { GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen, waitFor } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DragControls } from "../src/index.js";
import { AnimatePresence, animated, motionValue, pointerEventFromController, useDragControls } from "../src/index.js";
import { buildDeclarations } from "../src/style-registry.js";

const motionControllersOf = (widget: Gtk.Widget): Gtk.EventControllerMotion[] => {
    const found: Gtk.EventControllerMotion[] = [];
    const controllers = widget.observeControllers();
    for (let index = 0; index < controllers.getNItems(); index += 1) {
        const controller = controllers.getItem(index);
        if (controller instanceof Gtk.EventControllerMotion) found.push(controller);
    }
    return found;
};

const animClassOf = (widget: Gtk.Widget): string | undefined =>
    widget.getCssClasses().find((name) => name.startsWith("gtkx-anim-"));

const lastRuleFor = (spy: ReturnType<typeof vi.spyOn>, className: string): string | undefined => {
    for (let index = spy.mock.calls.length - 1; index >= 0; index -= 1) {
        const css = spy.mock.calls[index]?.[0] as string;
        const rule = css.split("\n").find((line) => line.startsWith(`.${className} `));
        if (rule) return rule;
    }
    return undefined;
};

describe("buildDeclarations", () => {
    it("translates style keys into GTK4 CSS declarations", () => {
        expect(buildDeclarations({ backgroundColor: "red", opacity: 0.5, borderRadius: 4 })).toBe(
            "background-color: red;opacity: 0.5;border-radius: 4px;",
        );
    });

    it("keeps only the 2D components of transform-origin", () => {
        expect(buildDeclarations({ transformOrigin: "50% 50% 0" })).toBe("transform-origin: 50% 50%;");
    });

    it("drops properties GTK4 CSS does not support", () => {
        expect(buildDeclarations({ width: 100, position: "absolute", transform: "translateX(2px)" })).toBe(
            "transform: translateX(2px);",
        );
    });

    it("maps concealed visibility to zero opacity", () => {
        expect(buildDeclarations({ visibility: "hidden" })).toBe("opacity: 0;");
        expect(buildDeclarations({ visibility: "collapse" })).toBe("opacity: 0;");
        expect(buildDeclarations({ visibility: "visible" })).toBe("");
    });

    it("emits border-spacing with a pixel unit for numeric values", () => {
        expect(buildDeclarations({ borderSpacing: 4 })).toBe("border-spacing: 4px;");
    });

    it("drops transform shorthands GTK4 CSS has no property for", () => {
        expect(buildDeclarations({ translate: "10px", perspective: 800, cursor: "pointer" })).toBe("");
    });

    it("passes CSS variables through untouched", () => {
        expect(buildDeclarations({ "--accent": "#ff0000" })).toBe("--accent: #ff0000;");
    });
});

describe("animated", () => {
    it("animates opacity from initial to animate", async () => {
        const spy = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");
        const ref = createRef<Gtk.Label | null>();
        const completed = vi.fn();

        await render(
            <animated.GtkLabel
                ref={ref}
                label="fade"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.05 }}
                onAnimationComplete={completed}
            />,
            { animations: true },
        );

        const widget = screen.getByText("fade");
        await waitFor(() => expect(completed).toHaveBeenCalled());
        const className = animClassOf(widget);
        expect(className).toBeDefined();
        await waitFor(() => {
            expect(lastRuleFor(spy, className as string)).toContain("opacity: 1");
        });
    });

    it("renders transforms as GTK CSS transform functions", async () => {
        const spy = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");
        const completed = vi.fn();

        await render(
            <animated.GtkLabel
                label="move"
                initial={{ x: 0 }}
                animate={{ x: 40, scale: 1.5 }}
                transition={{ duration: 0.05 }}
                onAnimationComplete={completed}
            />,
            { animations: true },
        );

        const widget = screen.getByText("move");
        await waitFor(() => expect(completed).toHaveBeenCalled());
        const className = animClassOf(widget) as string;
        await waitFor(() => {
            const rule = lastRuleFor(spy, className);
            expect(rule).toContain("translateX(40px)");
            expect(rule).toContain("scale(1.5)");
        });
    });

    it("applies static style values through the stylesheet", async () => {
        const spy = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");

        await render(<animated.GtkLabel label="styled" style={{ backgroundColor: "rgb(255,0,0)" }} />, {
            animations: true,
        });

        const widget = screen.getByText("styled");
        await waitFor(() => {
            const className = animClassOf(widget) as string;
            expect(lastRuleFor(spy, className)).toContain("background-color: rgb(255,0,0)");
        });
    });

    it("drives motion values passed through style", async () => {
        const spy = vi.spyOn(Gtk.CssProvider.prototype, "loadFromString");
        const opacity = motionValue(0.25);

        await render(<animated.GtkLabel label="valued" style={{ opacity }} />, { animations: true });

        const widget = screen.getByText("valued");
        await waitFor(() => {
            const className = animClassOf(widget) as string;
            expect(lastRuleFor(spy, className)).toContain("opacity: 0.25");
        });

        opacity.set(0.75);
        await waitFor(() => {
            const className = animClassOf(widget) as string;
            expect(lastRuleFor(spy, className)).toContain("opacity: 0.75");
        });
    });

    it("wraps arbitrary components through animated.create", async () => {
        const AnimatedButton = animated.create(GtkButton);
        const completed = vi.fn();

        await render(
            <AnimatedButton
                label="press"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.05 }}
                onAnimationComplete={completed}
            />,
            { animations: true },
        );

        const widget = screen.getByRole(Gtk.AccessibleRole.BUTTON);
        await waitFor(() => expect(completed).toHaveBeenCalled());
        expect(animClassOf(widget)).toBeDefined();
    });

    it("runs exit animations through AnimatePresence", async () => {
        const exited = vi.fn();

        const App = ({ show }: { show: boolean }) => (
            <AnimatePresence onExitComplete={exited}>
                {show ? (
                    <animated.GtkLabel
                        key="content"
                        label="leaving"
                        initial={false}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.05 }}
                    />
                ) : null}
            </AnimatePresence>
        );

        const { rerender } = await render(<App show={true} />, { animations: true });
        expect(screen.getByText("leaving")).toBeDefined();

        await rerender(<App show={false} />);
        await waitFor(() => expect(exited).toHaveBeenCalled());
        expect(screen.queryByText("leaving")).toBeNull();
    });

    it("starts drags from drag controls with pointer tracking on the window", async () => {
        const x = motionValue(0);
        const boxRef = createRef<Gtk.Box | null>();
        let controls: DragControls | null = null;

        const Fixture = () => {
            controls = useDragControls();
            return (
                <animated.GtkBox
                    ref={boxRef}
                    drag="x"
                    _dragX={x}
                    dragControls={controls}
                    dragListener={false}
                    dragMomentum={false}
                >
                    <GtkLabel label="handle-target" />
                </animated.GtkBox>
            );
        };

        await render(<Fixture />, { animations: true });
        const widget = boxRef.current as Gtk.Box;
        const root = widget.getRoot() as unknown as Gtk.Widget;
        const preexisting = new Set(motionControllersOf(root));

        act(() => {
            controls?.start({ pageX: 5, pageY: 5 } as PointerEvent);
        });
        const motionController = motionControllersOf(root).find((controller) => !preexisting.has(controller));
        expect(motionController).toBeDefined();

        act(() => {
            motionController?.emit("motion", 65, 5);
        });
        await waitFor(() => expect(x.get()).toBeCloseTo(60));

        act(() => {
            controls?.cancel();
        });
        expect(motionControllersOf(root)).toHaveLength(preexisting.size);
    });

    it("converts a controller into a pointer event for dragControls.start", async () => {
        const ref = createRef<Gtk.Button | null>();
        await render(<animated.GtkButton ref={ref} label="handle" animate={{ opacity: 1 }} />, { animations: true });
        const widget = ref.current as Gtk.Button;
        const gesture = new Gtk.GestureDrag();
        widget.addController(gesture);

        const event = pointerEventFromController(gesture);
        expect(event.target).toBe(widget);
        expect(typeof event.pageX).toBe("number");
        expect(typeof event.pageY).toBe("number");
    });

    it("forwards widget props and refs untouched", async () => {
        const ref = createRef<Gtk.Button | null>();
        const onClicked = vi.fn();

        await render(<animated.GtkButton ref={ref} label="real" onClicked={onClicked} animate={{ opacity: 1 }} />, {
            animations: true,
        });

        expect(ref.current).toBeInstanceOf(Gtk.Button);
        ref.current?.emit("clicked");
        expect(onClicked).toHaveBeenCalled();
    });
});
