import type * as Gtk from "@gtkx/ffi/gtk";
import type { ChildContainer } from "../container-interfaces.js";
import { Node } from "../node.js";
import { isListBoxRow } from "../predicates.js";

export class ListBoxNode extends Node<Gtk.ListBox> implements ChildContainer {
    static matches(type: string): boolean {
        return type === "ListBox";
    }

    attachChild(child: Gtk.Widget): void {
        this.widget.append(child);
    }

    insertChildBefore(child: Gtk.Widget, before: Gtk.Widget): void {
        if (isListBoxRow(before)) {
            this.widget.insert(child, before.getIndex());
        } else {
            this.widget.append(child);
        }
    }

    detachChild(child: Gtk.Widget): void {
        this.widget.remove(child);
    }
}
