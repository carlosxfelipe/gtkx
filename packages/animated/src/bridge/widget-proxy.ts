import type * as Gtk from "@gtkx/gi/gtk";
import {
    type GtkMotionWindow,
    motionWindow,
    type SyntheticEventListener,
    type SyntheticEventListenerOptions,
    SyntheticEventTarget,
} from "../motion-env.js";
import { rootWidgetOf } from "./geometry.js";
import { ensureBridgeControllers, releaseBridgeControllers } from "./widget-event-bridge.js";

export interface WidgetRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    right: number;
    bottom: number;
}

export interface AppliedAxisDelta {
    translate: number;
    scale: number;
    origin: number;
    originPoint: number;
}

export interface AppliedProjectionDelta {
    x: AppliedAxisDelta;
    y: AppliedAxisDelta;
}

export class WidgetProxy extends SyntheticEventTarget {
    widget: Gtk.Widget;
    ownerDocument: { defaultView: GtkMotionWindow };
    appliedProjectionDelta: AppliedProjectionDelta | null = null;

    constructor(widget: Gtk.Widget) {
        super();
        this.widget = widget;
        this.ownerDocument = { defaultView: motionWindow };
    }

    get parentElement(): WidgetProxy | null {
        const parent = this.widget.getParent();
        return parent ? proxyFor(parent) : null;
    }

    override addEventListener(
        type: string,
        listener: SyntheticEventListener,
        options?: SyntheticEventListenerOptions,
    ): void {
        super.addEventListener(type, listener, options);
        ensureBridgeControllers(this, type);
    }

    override removeEventListener(type: string, listener: SyntheticEventListener): void {
        super.removeEventListener(type, listener);
        releaseBridgeControllers(this);
    }

    getBoundingClientRect(): WidgetRect {
        const [ok, rect] = this.widget.computeBounds(rootWidgetOf(this.widget));
        const x = ok ? rect.getX() : 0;
        const y = ok ? rect.getY() : 0;
        const width = ok ? rect.getWidth() : 0;
        const height = ok ? rect.getHeight() : 0;
        return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height };
    }

    *[Symbol.iterator](): Iterator<WidgetProxy> {
        yield this;
    }
}

const proxies = new WeakMap<Gtk.Widget, WidgetProxy>();

export const proxyFor = (widget: Gtk.Widget): WidgetProxy => {
    const existing = proxies.get(widget);
    if (existing) return existing;
    const proxy = new WidgetProxy(widget);
    proxies.set(widget, proxy);
    return proxy;
};
