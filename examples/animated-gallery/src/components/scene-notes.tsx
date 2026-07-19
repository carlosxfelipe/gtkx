import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkLabel } from "@gtkx/jsx/gtk";

export const SceneNotes = ({ notes }: { notes: string[] }) => (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} marginTop={8}>
        {notes.map((note) => (
            <GtkLabel key={note} cssClasses={["dim-label"]} halign={Gtk.Align.START} xalign={0} wrap label={note} />
        ))}
    </GtkBox>
);
