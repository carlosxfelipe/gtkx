import { isObjectEqual } from "@gtkx/ffi";
import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { CommitPriority, scheduleAfterCommit } from "../scheduler.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type ExpanderRowWidget = Adw.ExpanderRow & {
    addRow(child: Gtk.Widget): void;
    addAction(widget: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

type ExpanderRowChildPosition = "row" | "action";

export class ExpanderRowChild extends VirtualNode {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ExpanderRowRow" || type === "ExpanderRowAction";
    }

    private parent?: ExpanderRowWidget;
    private children: Gtk.Widget[] = [];

    private getPosition(): ExpanderRowChildPosition {
        return this.typeName === "ExpanderRowRow" ? "row" : "action";
    }

    public setParent(newParent?: ExpanderRowWidget): void {
        this.parent = newParent;
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to '${this.typeName}': expected Widget`);
        }

        const widget = child.container;
        this.children.push(widget);

        scheduleAfterCommit(() => {
            if (this.parent) {
                if (this.getPosition() === "row") {
                    this.parent.addRow(widget);
                } else {
                    this.parent.addAction(widget);
                }
            }
        });
    }

    /**
     * ExpanderRow does not support reordering children after insertion.
     * New children are always appended to the end.
     */
    public override insertBefore(child: Node): void {
        this.appendChild(child);
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from '${this.typeName}': expected Widget`);
        }

        const widget = child.container;
        const parent = this.parent;
        const index = this.children.indexOf(widget);

        if (index !== -1) {
            this.children.splice(index, 1);
        }

        scheduleAfterCommit(() => {
            if (parent) {
                const currentParent = widget.getParent();

                if (currentParent && isObjectEqual(currentParent, parent)) {
                    parent.remove(widget);
                }
            }
        }, CommitPriority.HIGH);
    }

    public override unmount(): void {
        const parent = this.parent;
        const childrenToRemove = [...this.children];

        if (parent && childrenToRemove.length > 0) {
            scheduleAfterCommit(() => {
                for (const widget of childrenToRemove) {
                    const currentParent = widget.getParent();

                    if (currentParent && isObjectEqual(currentParent, parent)) {
                        parent.remove(widget);
                    }
                }
            }, CommitPriority.HIGH);
        }

        this.children = [];
        this.parent = undefined;
        super.unmount();
    }
}

registerNodeClass(ExpanderRowChild);
