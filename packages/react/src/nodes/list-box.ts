import type * as Gtk from "@gtkx/ffi/gtk";
import { isListBoxRow } from "../predicates.js";
import { IndexedChildContainerNode } from "./indexed-child-container.js";

export class ListBoxNode extends IndexedChildContainerNode<Gtk.ListBox> {
    static matches(type: string): boolean {
        return type === "ListBox";
    }

    protected getInsertionIndex(before: Gtk.Widget): number {
        if (isListBoxRow(before)) {
            return before.getIndex();
        }
        return -1;
    }
}
