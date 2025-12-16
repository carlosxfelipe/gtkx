import type * as Gtk from "@gtkx/ffi/gtk";
import type { ChildContainer } from "../container-interfaces.js";
import { Node } from "../node.js";

type IndexedWidget = Gtk.Widget & {
    append(child: Gtk.Widget): void;
    insert(child: Gtk.Widget, position: number): void;
    remove(child: Gtk.Widget): void;
};

export abstract class IndexedChildContainerNode<T extends IndexedWidget> extends Node<T> implements ChildContainer {
    protected abstract getInsertionIndex(before: Gtk.Widget): number;

    protected getWidgetToRemove(child: Gtk.Widget): Gtk.Widget {
        return child;
    }

    attachChild(child: Gtk.Widget): void {
        this.widget.append(child);
    }

    insertChildBefore(child: Gtk.Widget, before: Gtk.Widget): void {
        const index = this.getInsertionIndex(before);
        if (index >= 0) {
            this.widget.insert(child, index);
        } else {
            this.widget.append(child);
        }
    }

    detachChild(child: Gtk.Widget): void {
        const toRemove = this.getWidgetToRemove(child);
        this.widget.remove(toRemove);
    }
}
