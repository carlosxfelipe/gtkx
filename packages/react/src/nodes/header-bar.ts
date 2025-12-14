import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { Node } from "../node.js";

/**
 * Node for AdwHeaderBar that uses packStart for non-slot children.
 */
export class AdwHeaderBarNode extends Node<Adw.HeaderBar> {
    static matches(type: string): boolean {
        return type === "AdwHeaderBar" || type === "AdwHeaderBar.Root";
    }

    appendChild(child: Node): void {
        const childWidget = child.getWidget();

        if (!childWidget) {
            child.attachToParent(this);
            return;
        }

        this.widget.packStart(childWidget);
    }

    removeChild(child: Node): void {
        const childWidget = child.getWidget();

        if (childWidget) {
            this.widget.remove(childWidget);
        }
    }
}

/**
 * Node for Gtk.HeaderBar that uses packStart for children.
 */
export class HeaderBarNode extends Node<Gtk.HeaderBar> {
    static matches(type: string): boolean {
        return type === "HeaderBar";
    }

    appendChild(child: Node): void {
        const childWidget = child.getWidget();

        if (!childWidget) {
            child.attachToParent(this);
            return;
        }

        this.widget.packStart(childWidget);
    }

    removeChild(child: Node): void {
        const childWidget = child.getWidget();

        if (childWidget) {
            this.widget.remove(childWidget);
        }
    }
}
