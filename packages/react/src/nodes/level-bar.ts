import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { LevelBarOffsetNode } from "./level-bar-offset.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

class LevelBarNode extends WidgetNode<Gtk.LevelBar> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return isContainerType(Gtk.LevelBar, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof LevelBarOffsetNode) {
            child.setLevelBar(this.container);
            child.addOffset();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.appendChild(child);
            return;
        }

        throw new Error(`Cannot append '${child.typeName}' to 'GtkLevelBar': expected LevelBarOffset or Widget`);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof LevelBarOffsetNode) {
            child.setLevelBar(this.container);
            child.addOffset();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.insertBefore(child, before);
            return;
        }

        throw new Error(`Cannot insert '${child.typeName}' into 'GtkLevelBar': expected LevelBarOffset or Widget`);
    }

    public override removeChild(child: Node): void {
        if (child instanceof LevelBarOffsetNode) {
            child.removeOffset();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.removeChild(child);
            return;
        }

        throw new Error(`Cannot remove '${child.typeName}' from 'GtkLevelBar': expected LevelBarOffset or Widget`);
    }
}

registerNodeClass(LevelBarNode);
