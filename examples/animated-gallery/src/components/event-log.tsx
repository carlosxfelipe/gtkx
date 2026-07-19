import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkLabel } from "@gtkx/jsx/gtk";
import { monoStyle } from "../theme.js";

export const EventLog = ({ entries }: { entries: string[] }) => (
    <GtkBox
        orientation={Gtk.Orientation.VERTICAL}
        spacing={2}
        widthRequest={240}
        valign={Gtk.Align.START}
        name="event-log"
    >
        {entries.map((entry, index) => (
            <GtkLabel key={`${index}-${entry}`} cssClasses={["dim-label", monoStyle]} xalign={0} label={entry} />
        ))}
    </GtkBox>
);
