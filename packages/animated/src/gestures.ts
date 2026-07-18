import type * as Gtk from "@gtkx/gi/gtk";
import { EventControllerFocus, EventControllerMotion, Gesture, GestureClick } from "@gtkx/gi/gtk";
import { Feature, isDragActive } from "motion/react";
import { measureWidgetBounds } from "./visual-element.js";

export type SyntheticPointerEvent = {
    type: string;
    target: Gtk.Widget;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
    timeStamp: number;
};

export type PointInfo = { point: { x: number; y: number } };

export const pointerEventAtPoint = (
    type: string,
    widget: Gtk.Widget,
    pageX: number,
    pageY: number,
): [SyntheticPointerEvent, PointInfo] => {
    const event: SyntheticPointerEvent = {
        type,
        target: widget,
        clientX: pageX,
        clientY: pageY,
        pageX,
        pageY,
        timeStamp: performance.now(),
    };
    return [event, { point: { x: pageX, y: pageY } }];
};

export const pointerEventFor = (
    type: string,
    widget: Gtk.Widget,
    x: number,
    y: number,
): [SyntheticPointerEvent, PointInfo] => {
    const bounds = measureWidgetBounds(widget);
    return pointerEventAtPoint(type, widget, bounds.x.min + x, bounds.y.min + y);
};

const asPointerEvent = (event: SyntheticPointerEvent): PointerEvent => event as unknown as PointerEvent;

export const pointerEventFromController = (controller: Gtk.EventController): PointerEvent => {
    const widget = controller.getWidget();
    if (!widget) throw new Error("The controller is not attached to a widget");
    let x = 0;
    let y = 0;
    if (controller instanceof Gesture) {
        const [hasPoint, pointX, pointY] = controller.getPoint(null);
        if (hasPoint) {
            x = pointX;
            y = pointY;
        }
    }
    const [event] = pointerEventFor("pointerdown", widget, x, y);
    return asPointerEvent(event);
};

export abstract class ControllerFeature<Controller extends Gtk.EventController> extends Feature<Gtk.Widget> {
    protected controller: Controller | null = null;

    protected abstract createController(widget: Gtk.Widget): Controller;

    mount(): void {
        const widget = this.node.current;
        if (!widget) return;
        this.controller = this.createController(widget);
        widget.addController(this.controller);
    }

    unmount(): void {
        const widget = this.node.current;
        if (widget && this.controller) widget.removeController(this.controller);
        this.controller = null;
    }
}

export class HoverFeature extends ControllerFeature<Gtk.EventControllerMotion> {
    protected createController(widget: Gtk.Widget): Gtk.EventControllerMotion {
        const controller = new EventControllerMotion();
        controller.on("enter", (x, y) => {
            if (isDragActive()) return;
            this.node.animationState?.setActive("whileHover", true);
            const [event, info] = pointerEventFor("pointerenter", widget, x, y);
            this.node.getProps().onHoverStart?.(asPointerEvent(event), info);
        });
        controller.on("leave", () => {
            this.node.animationState?.setActive("whileHover", false);
            const [event, info] = pointerEventFor("pointerleave", widget, 0, 0);
            this.node.getProps().onHoverEnd?.(asPointerEvent(event), info);
        });
        return controller;
    }
}

export class PressFeature extends ControllerFeature<Gtk.GestureClick> {
    private isPressing = false;

    private endPress(widget: Gtk.Widget, x: number, y: number, cancelled: boolean): void {
        if (!this.isPressing) return;
        this.isPressing = false;
        this.node.animationState?.setActive("whileTap", false);
        const props = this.node.getProps();
        const handler = cancelled || isDragActive() ? props.onTapCancel : props.onTap;
        const [event, info] = pointerEventFor(cancelled ? "pointercancel" : "pointerup", widget, x, y);
        handler?.(asPointerEvent(event), info);
    }

    protected createController(widget: Gtk.Widget): Gtk.GestureClick {
        const controller = new GestureClick();
        controller.on("pressed", (_nPress, x, y) => {
            if (this.isPressing) return;
            this.isPressing = true;
            this.node.animationState?.setActive("whileTap", true);
            const [event, info] = pointerEventFor("pointerdown", widget, x, y);
            this.node.getProps().onTapStart?.(asPointerEvent(event), info);
        });
        controller.on("released", (_nPress, x, y) => this.endPress(widget, x, y, false));
        controller.on("stopped", () => this.endPress(widget, 0, 0, true));
        return controller;
    }
}

export class FocusFeature extends ControllerFeature<Gtk.EventControllerFocus> {
    private isActive = false;

    protected createController(widget: Gtk.Widget): Gtk.EventControllerFocus {
        const controller = new EventControllerFocus();
        controller.on("enter", () => {
            const root = widget.getRoot();
            const focusVisible = root && "getFocusVisible" in root ? (root as Gtk.Window).getFocusVisible() : true;
            if (!focusVisible) return;
            this.isActive = true;
            this.node.animationState?.setActive("whileFocus", true);
        });
        controller.on("leave", () => {
            if (!this.isActive) return;
            this.isActive = false;
            this.node.animationState?.setActive("whileFocus", false);
        });
        return controller;
    }
}
