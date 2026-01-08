import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { CalendarMarkNode } from "./calendar-mark.js";
import { isContainerType } from "./internal/utils.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

class CalendarNode extends WidgetNode<Gtk.Calendar> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return isContainerType(Gtk.Calendar, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof CalendarMarkNode) {
            child.setCalendar(this.container);
            child.addMark();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.appendChild(child);
            return;
        }

        throw new Error(`Cannot append '${child.typeName}' to 'GtkCalendar': expected CalendarMark or Widget`);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof CalendarMarkNode) {
            child.setCalendar(this.container);
            child.addMark();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.insertBefore(child, before);
            return;
        }

        throw new Error(`Cannot insert '${child.typeName}' into 'GtkCalendar': expected CalendarMark or Widget`);
    }

    public override removeChild(child: Node): void {
        if (child instanceof CalendarMarkNode) {
            child.removeMark();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.removeChild(child);
            return;
        }

        throw new Error(`Cannot remove '${child.typeName}' from 'GtkCalendar': expected CalendarMark or Widget`);
    }
}

registerNodeClass(CalendarNode);
