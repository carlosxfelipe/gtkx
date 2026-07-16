import * as Gdk from "@gtkx/gi/gdk";
import * as Gtk from "@gtkx/gi/gtk";
import { motionWindow, type SyntheticEventTarget } from "../motion-env.js";
import { type PagePoint, toRootPoint } from "./geometry.js";

export interface BridgeTarget extends SyntheticEventTarget {
    widget: Gtk.Widget;
}

const DRAG_CLAIM_DISTANCE = 3;

type PointerType = "mouse" | "pen" | "touch";

interface BridgeState {
    hoverController: Gtk.EventControllerMotion | null;
    clickGesture: Gtk.GestureClick | null;
    dragGesture: Gtk.GestureDrag | null;
    pressActive: boolean;
    claimed: boolean;
    startLocal: PagePoint;
    startPage: PagePoint;
}

interface PressContext {
    proxy: BridgeTarget;
    state: BridgeState;
}

interface PressEnd {
    type: "pointerup" | "pointercancel";
    local: PagePoint;
    pointerType: PointerType;
    button: number;
}

const states = new WeakMap<BridgeTarget, BridgeState>();

const stateFor = (proxy: BridgeTarget): BridgeState => {
    const existing = states.get(proxy);
    if (existing) return existing;
    const state: BridgeState = {
        hoverController: null,
        clickGesture: null,
        dragGesture: null,
        pressActive: false,
        claimed: false,
        startLocal: { x: 0, y: 0 },
        startPage: { x: 0, y: 0 },
    };
    states.set(proxy, state);
    return state;
};

const pointerTypeOf = (device: Gdk.Device | null): PointerType => {
    switch (device?.getSource()) {
        case Gdk.InputSource.PEN:
            return "pen";
        case Gdk.InputSource.TOUCHSCREEN:
            return "touch";
        default:
            return "mouse";
    }
};

const domButton = (gtkButton: number): number => (gtkButton > 0 ? gtkButton - 1 : 0);

const beginPress = (context: PressContext, local: PagePoint, pointerType: PointerType, button: number): void => {
    const { proxy, state } = context;
    if (state.pressActive) return;
    state.pressActive = true;
    state.startLocal = local;
    state.startPage = toRootPoint(proxy.widget, local.x, local.y);
    proxy.dispatchEvent({
        type: "pointerdown",
        pageX: state.startPage.x,
        pageY: state.startPage.y,
        pointerType,
        isPrimary: true,
        button,
    });
};

const endPress = (context: PressContext, end: PressEnd): void => {
    const { proxy, state } = context;
    if (!state.pressActive) return;
    state.pressActive = false;
    state.claimed = false;
    const page = toRootPoint(proxy.widget, end.local.x, end.local.y);
    const target = end.type === "pointerup" && proxy.widget.contains(end.local.x, end.local.y) ? proxy : motionWindow;
    motionWindow.dispatchEvent({
        type: end.type,
        target,
        pageX: page.x,
        pageY: page.y,
        pointerType: end.pointerType,
        isPrimary: true,
        button: end.button,
    });
};

const currentDragPage = (context: PressContext, drag: Gtk.GestureDrag, offset: PagePoint): PagePoint => {
    const [ok, x, y] = drag.getPoint(null);
    if (ok) return toRootPoint(context.proxy.widget, x, y);
    return { x: context.state.startPage.x + offset.x, y: context.state.startPage.y + offset.y };
};

const ensureHover = (proxy: BridgeTarget): void => {
    const state = stateFor(proxy);
    if (state.hoverController) return;
    const controller = new Gtk.EventControllerMotion();
    state.hoverController = controller;
    controller.on("enter", (x: number, y: number) => {
        const page = toRootPoint(proxy.widget, x, y);
        proxy.dispatchEvent({
            type: "pointerenter",
            pageX: page.x,
            pageY: page.y,
            pointerType: pointerTypeOf(controller.getCurrentEventDevice()),
            isPrimary: true,
            button: 0,
        });
    });
    controller.on("leave", () => {
        proxy.dispatchEvent({
            type: "pointerleave",
            pointerType: pointerTypeOf(controller.getCurrentEventDevice()),
            isPrimary: true,
            button: 0,
        });
    });
    proxy.widget.addController(controller);
};

const attachClickGesture = (context: PressContext): void => {
    const click = new Gtk.GestureClick();
    click.setButton(0);
    context.state.clickGesture = click;
    click.on("pressed", (_nPress: number, x: number, y: number) => {
        beginPress(context, { x, y }, pointerTypeOf(click.getDevice()), domButton(click.getCurrentButton()));
    });
    click.on("released", (_nPress: number, x: number, y: number) => {
        endPress(context, {
            type: "pointerup",
            local: { x, y },
            pointerType: pointerTypeOf(click.getDevice()),
            button: domButton(click.getCurrentButton()),
        });
    });
    context.proxy.widget.addController(click);
};

const attachDragGesture = (context: PressContext): void => {
    const { state } = context;
    const drag = new Gtk.GestureDrag();
    drag.setPropagationPhase(Gtk.PropagationPhase.CAPTURE);
    state.dragGesture = drag;
    drag.on("drag-begin", (startX: number, startY: number) => {
        beginPress(context, { x: startX, y: startY }, pointerTypeOf(drag.getDevice()), 0);
    });
    drag.on("drag-update", (offsetX: number, offsetY: number) => {
        if (!state.pressActive) return;
        const page = currentDragPage(context, drag, { x: offsetX, y: offsetY });
        if (
            !state.claimed &&
            Math.hypot(offsetX, offsetY) >= DRAG_CLAIM_DISTANCE &&
            motionWindow.listenerCount("pointermove") > 0
        ) {
            state.claimed = true;
            drag.setState(Gtk.EventSequenceState.CLAIMED);
        }
        motionWindow.dispatchEvent({
            type: "pointermove",
            pageX: page.x,
            pageY: page.y,
            pointerType: pointerTypeOf(drag.getDevice()),
            isPrimary: true,
            button: 0,
        });
    });
    drag.on("drag-end", (offsetX: number, offsetY: number) => {
        endPress(context, {
            type: "pointerup",
            local: { x: state.startLocal.x + offsetX, y: state.startLocal.y + offsetY },
            pointerType: pointerTypeOf(drag.getDevice()),
            button: 0,
        });
    });
    drag.on("cancel", () => {
        endPress(context, { type: "pointercancel", local: state.startLocal, pointerType: "mouse", button: 0 });
    });
    context.proxy.widget.addController(drag);
};

const ensurePress = (proxy: BridgeTarget): void => {
    const state = stateFor(proxy);
    if (state.clickGesture) return;
    const context: PressContext = { proxy, state };
    attachClickGesture(context);
    attachDragGesture(context);
};

const HOVER_EVENTS = new Set(["pointerenter", "pointerleave"]);

export const ensureBridgeControllers = (proxy: BridgeTarget, type: string): void => {
    if (HOVER_EVENTS.has(type)) ensureHover(proxy);
    else if (type === "pointerdown") ensurePress(proxy);
};

export const releaseBridgeControllers = (proxy: BridgeTarget): void => {
    const state = states.get(proxy);
    if (!state) return;
    if (
        state.hoverController &&
        proxy.listenerCount("pointerenter") === 0 &&
        proxy.listenerCount("pointerleave") === 0
    ) {
        proxy.widget.removeController(state.hoverController);
        state.hoverController = null;
    }
    if (state.clickGesture && proxy.listenerCount("pointerdown") === 0) {
        proxy.widget.removeController(state.clickGesture);
        state.clickGesture = null;
        if (state.dragGesture) {
            proxy.widget.removeController(state.dragGesture);
            state.dragGesture = null;
        }
        state.pressActive = false;
        state.claimed = false;
    }
};
