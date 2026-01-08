import type * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import { VirtualNode } from "./virtual.js";

export type CalendarMarkProps = {
    day: number;
};

export class CalendarMarkNode extends VirtualNode<CalendarMarkProps> {
    public static override priority = 1;

    private calendar?: Gtk.Calendar;

    public static override matches(type: string): boolean {
        return type === "CalendarMark";
    }

    public setCalendar(calendar: Gtk.Calendar): void {
        this.calendar = calendar;
    }

    public addMark(): void {
        this.calendar?.markDay(this.props.day);
    }

    public removeMark(): void {
        this.calendar?.unmarkDay(this.props.day);
    }

    public override updateProps(oldProps: CalendarMarkProps | null, newProps: CalendarMarkProps): void {
        super.updateProps(oldProps, newProps);

        if (oldProps && this.calendar && oldProps.day !== newProps.day) {
            this.calendar.unmarkDay(oldProps.day);
            this.calendar.markDay(newProps.day);
        }
    }

    public override unmount(): void {
        this.removeMark();
        super.unmount();
    }
}

registerNodeClass(CalendarMarkNode);
