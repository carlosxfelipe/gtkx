import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { scheduleAfterCommit } from "../scheduler.js";
import type { PrefixSuffixWidget } from "./action-row.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type ActionRowChildPosition = "prefix" | "suffix";

export class ActionRowChild extends VirtualNode {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ActionRow.Prefix" || type === "ActionRow.Suffix";
    }

    private parent?: PrefixSuffixWidget;
    private children: Gtk.Widget[] = [];

    private getPosition(): ActionRowChildPosition {
        return this.typeName === "ActionRow.Prefix" ? "prefix" : "suffix";
    }

    public setParent(newParent?: PrefixSuffixWidget): void {
        const oldParent = this.parent;
        this.parent = newParent;

        if (!newParent && oldParent) {
            const childrenToRemove = [...this.children];
            scheduleAfterCommit(() => {
                for (const widget of childrenToRemove) {
                    oldParent.remove(widget);
                }
            });
            this.children = [];
        }
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to '${this.typeName}': expected Widget`);
        }

        const widget = child.container;
        this.children.push(widget);

        scheduleAfterCommit(() => {
            if (this.parent) {
                if (this.getPosition() === "prefix") {
                    this.parent.addPrefix(widget);
                } else {
                    this.parent.addSuffix(widget);
                }
            }
        });
    }

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
                parent.remove(widget);
            }
        });
    }
}

registerNodeClass(ActionRowChild);
