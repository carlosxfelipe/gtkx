import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { scheduleAfterCommit } from "../scheduler.js";
import type { PackableWidget } from "./pack.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type PackChildPosition = "start" | "end";

export class PackChild extends VirtualNode {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "Pack.Start" || type === "Pack.End";
    }

    private parent?: PackableWidget;

    private getPosition(): PackChildPosition {
        return this.typeName === "Pack.Start" ? "start" : "end";
    }

    public setParent(parent?: PackableWidget): void {
        this.parent = parent;
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to '${this.typeName}': expected Widget`);
        }

        const widget = child.container;

        scheduleAfterCommit(() => {
            if (this.parent) {
                if (this.getPosition() === "start") {
                    this.parent.packStart(widget);
                } else {
                    this.parent.packEnd(widget);
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

        scheduleAfterCommit(() => {
            if (this.parent) {
                this.parent.remove(widget);
            }
        });
    }
}

registerNodeClass(PackChild);
