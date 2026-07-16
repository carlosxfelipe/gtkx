import * as Gtk from "@gtkx/gi/gtk";
import { describe, expect, it } from "vitest";
import { proxyFor } from "../src/bridge/widget-proxy.js";
import { motionWindow, type SyntheticEvent } from "../src/motion-env.js";

const controllersOf = (widget: Gtk.Widget): Gtk.EventController[] => {
    const model = widget.observeControllers();
    const controllers: Gtk.EventController[] = [];
    const count = model.getNItems();
    for (let index = 0; index < count; index += 1) {
        const item = model.getItem(index);
        if (item instanceof Gtk.EventController) controllers.push(item);
    }
    return controllers;
};

const findController = <T extends Gtk.EventController>(widget: Gtk.Widget, type: new (...args: never[]) => T): T => {
    const found = controllersOf(widget).find((controller): controller is T => controller instanceof type);
    if (!found) throw new Error(`no ${type.name} attached`);
    return found;
};

const collectWindowEvents = (types: string[], signal: AbortSignal): SyntheticEvent[] => {
    const events: SyntheticEvent[] = [];
    for (const type of types) {
        motionWindow.addEventListener(type, (event) => events.push(event), { signal });
    }
    return events;
};

describe("widget proxy", () => {
    it("memoizes proxies and exposes the parentElement chain", () => {
        const parent = new Gtk.Box();
        const child = new Gtk.Box();
        parent.append(child);
        expect(proxyFor(child)).toBe(proxyFor(child));
        expect(proxyFor(child).parentElement).toBe(proxyFor(parent));
        expect(proxyFor(parent).parentElement).toBeNull();
        expect([...proxyFor(child)]).toEqual([proxyFor(child)]);
        expect(proxyFor(child).ownerDocument.defaultView).toBe(motionWindow);
    });
});

describe("widget event bridge", () => {
    it("materializes a motion controller for hover and synthesizes enter/leave", () => {
        const widget = new Gtk.Box();
        const proxy = proxyFor(widget);
        const events: SyntheticEvent[] = [];
        const controller = new AbortController();
        proxy.addEventListener("pointerenter", (event) => events.push(event), { signal: controller.signal });
        proxy.addEventListener("pointerleave", (event) => events.push(event), { signal: controller.signal });

        const motion = findController(widget, Gtk.EventControllerMotion);
        motion.emit("enter", 5, 7);
        motion.emit("leave");

        expect(events.map((event) => event.type)).toEqual(["pointerenter", "pointerleave"]);
        expect(events[0]?.pageX).toBe(5);
        expect(events[0]?.pageY).toBe(7);
        expect(events[0]?.pointerType).toBe("mouse");
        controller.abort();
    });

    it("dedups pointerdown between the click and drag gestures", () => {
        const widget = new Gtk.Box();
        const proxy = proxyFor(widget);
        const downs: SyntheticEvent[] = [];
        const abort = new AbortController();
        const windowEvents = collectWindowEvents(["pointerup"], abort.signal);
        proxy.addEventListener("pointerdown", (event) => downs.push(event), { signal: abort.signal });

        const click = findController(widget, Gtk.GestureClick);
        const drag = findController(widget, Gtk.GestureDrag);
        click.emit("pressed", 1, 2, 3);
        drag.emit("drag-begin", 2, 3);
        expect(downs).toHaveLength(1);
        expect(downs[0]?.button).toBe(0);

        click.emit("released", 1, 2, 3);
        click.emit("released", 1, 2, 3);
        expect(windowEvents).toHaveLength(1);
        expect(windowEvents[0]?.type).toBe("pointerup");
        abort.abort();
    });

    it("synthesizes a full drag stream onto the window proxy", () => {
        const widget = new Gtk.Box();
        const proxy = proxyFor(widget);
        const abort = new AbortController();
        const downs: SyntheticEvent[] = [];
        const windowEvents = collectWindowEvents(["pointermove", "pointerup", "pointercancel"], abort.signal);
        proxy.addEventListener("pointerdown", (event) => downs.push(event), { signal: abort.signal });

        const drag = findController(widget, Gtk.GestureDrag);
        drag.emit("drag-begin", 10, 10);
        drag.emit("drag-update", 30, 5);
        drag.emit("drag-end", 50, 0);

        expect(downs).toHaveLength(1);
        expect(downs[0]?.pageX).toBe(10);
        expect(windowEvents.map((event) => event.type)).toEqual(["pointermove", "pointerup"]);
        expect(windowEvents[0]?.pageX).toBe(40);
        expect(windowEvents[0]?.pageY).toBe(15);
        expect(windowEvents[1]?.pageX).toBe(60);
        expect(windowEvents[1]?.pageY).toBe(10);
        expect(windowEvents[1]?.target).toBe(motionWindow);
        abort.abort();
    });

    it("synthesizes pointercancel when the drag gesture is cancelled", () => {
        const widget = new Gtk.Box();
        const proxy = proxyFor(widget);
        const abort = new AbortController();
        const windowEvents = collectWindowEvents(["pointercancel"], abort.signal);
        proxy.addEventListener("pointerdown", () => undefined, { signal: abort.signal });

        const drag = findController(widget, Gtk.GestureDrag);
        drag.emit("drag-begin", 0, 0);
        drag.emit("cancel", null);

        expect(windowEvents).toHaveLength(1);
        expect(windowEvents[0]?.target).toBe(motionWindow);
        abort.abort();
    });

    it("removes bridge controllers once every listener is gone", () => {
        const widget = new Gtk.Box();
        const proxy = proxyFor(widget);
        const abort = new AbortController();
        proxy.addEventListener("pointerenter", () => undefined, { signal: abort.signal });
        proxy.addEventListener("pointerdown", () => undefined, { signal: abort.signal });
        expect(controllersOf(widget)).toHaveLength(3);

        abort.abort();
        expect(controllersOf(widget)).toHaveLength(0);
    });
});
