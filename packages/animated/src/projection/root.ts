import "../motion-env.js";
import * as Gtk from "@gtkx/gi/gtk";
import { createProjectionNode, type IProjectionNode } from "motion-dom";
import { WidgetProxy } from "../bridge/widget-proxy.js";
import { setWindowMetrics } from "../motion-env.js";
import { scheduleAfterGtkLayout } from "./frame-sync.js";

interface RootAnchor {
    kind: "gtkx-projection-root";
}

const subscribeToplevelLayout = (notify: () => void): (() => void) => {
    const toplevels = Gtk.Window.getToplevels();
    const knownWidths = new WeakMap<object, number>();
    const subscribeWindow = (window: Gtk.Window): void => {
        const surface = window.getSurface();
        if (!surface || knownWidths.has(surface)) return;
        knownWidths.set(surface, window.getWidth());
        setWindowMetrics({ innerWidth: window.getWidth(), innerHeight: window.getHeight() });
        surface.on("layout", (width: number, height: number) => {
            const previous = knownWidths.get(surface);
            knownWidths.set(surface, width);
            setWindowMetrics({ innerWidth: width, innerHeight: height });
            if (previous !== undefined && previous !== 0 && previous !== width) notify();
        });
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
    };
};

const GtkRootProjectionNodeBase = createProjectionNode<RootAnchor>({
    attachResizeListener: (_anchor, notify) => subscribeToplevelLayout(notify),
    measureScroll: () => ({ x: 0, y: 0 }),
    checkIsScrollRoot: () => true,
});

interface ProjectionChild {
    instance?: unknown;
}

class GtkRootProjectionNode extends GtkRootProjectionNodeBase {
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
        for (const child of children) {
            if (child.instance instanceof WidgetProxy) return child.instance.widget;
        }
        return null;
    }

    override didUpdate(): void {
        if (this.updateScheduled) return;
        this.updateScheduled = true;
        scheduleAfterGtkLayout(this.frameClockWidget(), () => {
            this.updateScheduled = false;
            this.update();
        });
    }
}

let rootNode: GtkRootProjectionNode | null = null;

export const getRootProjectionNode = (): IProjectionNode => {
    if (!rootNode) {
        rootNode = new GtkRootProjectionNode({});
        rootNode.mount({ kind: "gtkx-projection-root" });
    }
    return rootNode as IProjectionNode;
};
