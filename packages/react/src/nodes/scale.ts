import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { ScaleMarkNode } from "./scale-mark.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

class ScaleNode extends WidgetNode<Gtk.Scale> {
    public static override priority = 1;

    private markChildren: ScaleMarkNode[] = [];

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return isContainerType(Gtk.Scale, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof ScaleMarkNode) {
            child.setScale(this.container, () => this.rebuildAllMarks());
            this.markChildren.push(child);
            child.addMark();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.appendChild(child);
            return;
        }

        throw new Error(`Cannot append '${child.typeName}' to 'GtkScale': expected ScaleMark or Widget`);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof ScaleMarkNode) {
            child.setScale(this.container, () => this.rebuildAllMarks());

            const beforeIndex = this.markChildren.indexOf(before as ScaleMarkNode);
            if (beforeIndex >= 0) {
                this.markChildren.splice(beforeIndex, 0, child);
            } else {
                this.markChildren.push(child);
            }

            this.rebuildAllMarks();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.insertBefore(child, before);
            return;
        }

        throw new Error(`Cannot insert '${child.typeName}' into 'GtkScale': expected ScaleMark or Widget`);
    }

    public override removeChild(child: Node): void {
        if (child instanceof ScaleMarkNode) {
            const index = this.markChildren.indexOf(child);
            if (index >= 0) {
                this.markChildren.splice(index, 1);
            }
            this.rebuildAllMarks();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.removeChild(child);
            return;
        }

        throw new Error(`Cannot remove '${child.typeName}' from 'GtkScale': expected ScaleMark or Widget`);
    }

    private rebuildAllMarks(): void {
        this.container.clearMarks();

        for (const mark of this.markChildren) {
            mark.addMark();
        }
    }
}

registerNodeClass(ScaleNode);
