import "../motion-env.js";
import * as Gtk from "@gtkx/gi/gtk";
import { createProjectionNode, type Point2D } from "motion-dom";
import type { WidgetProxy } from "../bridge/widget-proxy.js";
import { getRootProjectionNode } from "./root.js";

const scrollOffsetsOf = (widget: Gtk.Widget): Point2D => {
    if (widget instanceof Gtk.ScrolledWindow) {
        const horizontal = widget.getHadjustment();
        const vertical = widget.getVadjustment();
        return { x: horizontal ? horizontal.getValue() : 0, y: vertical ? vertical.getValue() : 0 };
    }
    return { x: 0, y: 0 };
};

const WidgetProjectionNodeBase: ReturnType<typeof createProjectionNode<WidgetProxy>> =
    createProjectionNode<WidgetProxy>({
        measureScroll: (proxy) => scrollOffsetsOf(proxy.widget),
        checkIsScrollRoot: () => false,
        resetTransform: () => undefined,
        defaultParent: () => getRootProjectionNode(),
    });

export class WidgetProjectionNode extends WidgetProjectionNodeBase {
    override willUpdate(shouldNotifyListeners?: boolean): void {
        if (this.isLayoutDirty && !this.snapshot) this.isLayoutDirty = false;
        super.willUpdate(shouldNotifyListeners);
    }
}
