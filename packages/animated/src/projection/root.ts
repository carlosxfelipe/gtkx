import "../motion-env.js";
import type * as Gdk from "@gtkx/gi/gdk";
import * as Gtk from "@gtkx/gi/gtk";
import { scheduleAfterLayout } from "@gtkx/react/internal";
import { createProjectionNode, type IProjectionNode, microtask } from "motion-dom";
import { WidgetProxy } from "../bridge/widget-proxy.js";
import { setWindowMetrics } from "../motion-env.js";

interface RootAnchor {
    kind: "gtkx-projection-root";
}

const subscribeToplevelLayout = (notify: () => void): (() => void) => {
    const toplevels = Gtk.Window.getToplevels();
    const layoutHandlers = new Map<Gdk.Surface, (width: number, height: number) => void>();
    const realizeHandlers = new Map<Gtk.Window, () => void>();
    const subscribeSurface = (window: Gtk.Window, surface: Gdk.Surface): void => {
        if (layoutHandlers.has(surface)) return;
        let knownWidth = window.getWidth();
        let knownHeight = window.getHeight();
        setWindowMetrics({ innerWidth: knownWidth, innerHeight: knownHeight });
        const onLayout = (width: number, height: number): void => {
            const widthChanged = knownWidth !== 0 && knownWidth !== width;
            const heightChanged = knownHeight !== 0 && knownHeight !== height;
            knownWidth = width;
            knownHeight = height;
            setWindowMetrics({ innerWidth: width, innerHeight: height });
            if (widthChanged || heightChanged) notify();
        };
        layoutHandlers.set(surface, onLayout);
        surface.on("layout", onLayout);
    };
    const subscribeWindow = (window: Gtk.Window): void => {
        const surface = window.getSurface();
        if (surface) {
            subscribeSurface(window, surface);
            return;
        }
        if (realizeHandlers.has(window)) return;
        const onRealize = (): void => {
            window.off("realize", onRealize);
            realizeHandlers.delete(window);
            subscribeWindow(window);
        };
        realizeHandlers.set(window, onRealize);
        window.on("realize", onRealize);
    };
    const scan = (): void => {
        const count = toplevels.getNItems();
        for (let index = 0; index < count; index += 1) {
            const item = toplevels.getItem(index);
            if (item instanceof Gtk.Window) subscribeWindow(item);
        }
    };
    scan();
    toplevels.on("items-changed", scan);
    return () => {
        toplevels.off("items-changed", scan);
        for (const [surface, handler] of layoutHandlers) surface.off("layout", handler);
        layoutHandlers.clear();
        for (const [window, handler] of realizeHandlers) window.off("realize", handler);
        realizeHandlers.clear();
    };
};

const RootProjectionNodeBase = createProjectionNode<RootAnchor>({
    attachResizeListener: (_anchor, notify) => subscribeToplevelLayout(notify),
    measureScroll: () => ({ x: 0, y: 0 }),
    checkIsScrollRoot: () => true,
});

interface ProjectionChild {
    instance?: unknown;
    children?: Set<ProjectionChild>;
}

const clockedWidgetIn = (nodes: Set<ProjectionChild>): Gtk.Widget | null => {
    for (const node of nodes) {
        const instance = node.instance;
        if (instance instanceof WidgetProxy && instance.widget.getFrameClock() !== null) return instance.widget;
        const nested = node.children ? clockedWidgetIn(node.children) : null;
        if (nested) return nested;
    }
    return null;
};

const clockedToplevel = (): Gtk.Widget | null => {
    const toplevels = Gtk.Window.getToplevels();
    const count = toplevels.getNItems();
    for (let index = 0; index < count; index += 1) {
        const item = toplevels.getItem(index);
        if (item instanceof Gtk.Window && item.getFrameClock() !== null) return item;
    }
    return null;
};

class RootProjectionNode extends RootProjectionNodeBase {
    constructor(latestValues: Record<string, string | number> = {}) {
        super(latestValues);
        const baseCheckUpdateFailed = this.checkUpdateFailed;
        this.checkUpdateFailed = (): void => {
            if (this.updateScheduled) return;
            baseCheckUpdateFailed();
        };
    }

    private frameClockWidget(): Gtk.Widget | null {
        const children: Set<ProjectionChild> = this.children;
        return clockedWidgetIn(children) ?? clockedToplevel();
    }

    override didUpdate(): void {
        if (this.updateScheduled) return;
        this.updateScheduled = true;
        const run = (): void => {
            this.updateScheduled = false;
            this.update();
        };
        const widget = this.frameClockWidget();
        if (!widget) {
            microtask.read(run);
            return;
        }
        scheduleAfterLayout(widget, run);
    }
}

let rootNode: RootProjectionNode | null = null;

export const getRootProjectionNode = (): IProjectionNode => {
    if (!rootNode) {
        rootNode = new RootProjectionNode({});
        rootNode.mount({ kind: "gtkx-projection-root" });
    }
    return rootNode as IProjectionNode;
};
