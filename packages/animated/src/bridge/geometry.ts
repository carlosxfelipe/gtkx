import * as Graphene from "@gtkx/gi/graphene";
import type * as Gtk from "@gtkx/gi/gtk";

export interface PagePoint {
    x: number;
    y: number;
}

export const rootWidgetOf = (widget: Gtk.Widget): Gtk.Widget => {
    const parent = widget.getParent();
    return parent ? rootWidgetOf(parent) : widget;
};

export const toRootPoint = (widget: Gtk.Widget, x: number, y: number): PagePoint => {
    const [ok, point] = widget.computePoint(rootWidgetOf(widget), new Graphene.Point({ x, y }));
    return ok ? { x: point.x, y: point.y } : { x, y };
};
