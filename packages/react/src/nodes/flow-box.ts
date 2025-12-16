import type * as Gtk from "@gtkx/ffi/gtk";
import { isFlowBoxChild } from "../predicates.js";
import { IndexedChildContainerNode } from "./indexed-child-container.js";

export class FlowBoxNode extends IndexedChildContainerNode<Gtk.FlowBox> {
    static matches(type: string): boolean {
        return type === "FlowBox";
    }

    protected getInsertionIndex(before: Gtk.Widget): number {
        const beforeParent = before.getParent();
        if (beforeParent && isFlowBoxChild(beforeParent)) {
            return beforeParent.getIndex();
        }
        return -1;
    }

    protected override getWidgetToRemove(child: Gtk.Widget): Gtk.Widget {
        return child.getParent() ?? child;
    }
}
