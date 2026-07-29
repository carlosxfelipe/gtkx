import * as Gdk from "@gtkx/gi/gdk";
import * as Gtk from "@gtkx/gi/gtk";

const lookupIconPaintable = (iconName: string, size = 16): Gtk.IconPaintable => {
    const display = Gdk.Display.getDefault();

    if (display === null) {
        throw new Error("Expected a default GdkDisplay");
    }

    const theme = Gtk.IconTheme.getForDisplay(display);

    return theme.lookupIcon(iconName, null, size, 1, Gtk.TextDirection.LTR, Gtk.IconLookupFlags.PRELOAD);
};

const countPaintables = (buffer: Gtk.TextBuffer): number => {
    const iter = buffer.getStartIter();
    let count = 0;

    do {
        if (iter.getPaintable() !== null) {
            count++;
        }
    } while (iter.forwardChar());

    return count;
};

export { lookupIconPaintable, countPaintables };
