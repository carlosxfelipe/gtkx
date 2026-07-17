import { animated, motionValue } from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkLabel } from "@gtkx/jsx/gtk";
import { screen, waitFor } from "@gtkx/testing";
import { describe, expect, it, vi } from "vitest";
import { render } from "./helpers/animated-render.js";

const findDragGesture = (widget: Gtk.Widget): Gtk.GestureDrag => {
    const model = widget.observeControllers();
    const count = model.getNItems();
    for (let index = 0; index < count; index += 1) {
        const item = model.getItem(index);
        if (item instanceof Gtk.GestureDrag) return item;
    }
    throw new Error("no GestureDrag attached");
};

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 40));

const emitDrag = async (widget: Gtk.Widget, offsets: [number, number][]): Promise<void> => {
    const gesture = findDragGesture(widget);
    let currentOffset: [number, number] = [0, 0];
    vi.spyOn(gesture, "getStartPoint").mockImplementation(() => [true, 5, 5]);
    vi.spyOn(gesture, "getOffset").mockImplementation(() => [true, currentOffset[0], currentOffset[1]]);
    vi.spyOn(gesture, "getPoint").mockImplementation(() => [false, 0, 0]);
    gesture.emit("drag-begin", 5, 5);
    await settle();
    for (const offset of offsets) {
        currentOffset = offset;
        gesture.emit("drag-update", offset[0], offset[1]);
        await settle();
    }
    const last = offsets.at(-1) ?? [0, 0];
    gesture.emit("drag-end", last[0], last[1]);
    await settle();
};

describe("drag", () => {
    it("tracks the pointer and fires drag callbacks", async () => {
        const dragX = motionValue(0);
        const onDragStart = vi.fn();
        const onDrag = vi.fn();
        const onDragEnd = vi.fn();
        let widget: Gtk.Widget | null = null;
        await render(
            <GtkBox>
                <animated.GtkBox
                    drag="x"
                    dragMomentum={false}
                    _dragX={dragX}
                    onDragStart={onDragStart}
                    onDrag={onDrag}
                    onDragEnd={onDragEnd}
                    ref={(value) => {
                        if (value) widget = value;
                    }}
                >
                    <GtkLabel>Draggable</GtkLabel>
                </animated.GtkBox>
            </GtkBox>,
        );
        await screen.findByText("Draggable");
        if (widget === null) throw new Error("widget not mounted");

        await emitDrag(widget, [
            [10, 0],
            [25, 0],
            [40, 0],
        ]);

        await waitFor(() => expect(onDragStart).toHaveBeenCalled());
        expect(onDrag).toHaveBeenCalled();
        await waitFor(() => expect(onDragEnd).toHaveBeenCalled());
        await waitFor(() => expect(dragX.get()).toBeCloseTo(40, 0));
    });

    it("clamps to object constraints with zero elasticity", async () => {
        const dragX = motionValue(0);
        let widget: Gtk.Widget | null = null;
        await render(
            <GtkBox>
                <animated.GtkBox
                    drag="x"
                    dragMomentum={false}
                    dragElastic={0}
                    dragConstraints={{ left: 0, right: 20 }}
                    _dragX={dragX}
                    ref={(value) => {
                        if (value) widget = value;
                    }}
                >
                    <GtkLabel>Clamped</GtkLabel>
                </animated.GtkBox>
            </GtkBox>,
        );
        await screen.findByText("Clamped");
        if (widget === null) throw new Error("widget not mounted");

        await emitDrag(widget, [
            [10, 0],
            [60, 0],
        ]);

        await waitFor(() => expect(dragX.get()).toBeCloseTo(20, 0));
    });
});
