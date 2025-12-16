import type * as Gtk from "@gtkx/ffi/gtk";

interface Appendable extends Gtk.Widget {
    append(child: unknown): void;
}

interface Addable extends Gtk.Widget {
    add(child: unknown): void;
}

interface SingleChild extends Gtk.Widget {
    setChild(child: unknown): void;
}

interface Removable extends Gtk.Widget {
    remove(child: unknown): void;
}

/**
 * Type guard that checks if a GTK widget supports appending children via an append method.
 */
export const isAppendable = (widget: Gtk.Widget): widget is Appendable =>
    "append" in widget && typeof widget.append === "function";

/**
 * Type guard that checks if a GTK widget supports adding children via an add method.
 */
export const isAddable = (widget: Gtk.Widget): widget is Addable => "add" in widget && typeof widget.add === "function";

/**
 * Type guard that checks if a GTK widget supports a single child via setChild method.
 */
export const isSingleChild = (widget: Gtk.Widget): widget is SingleChild =>
    "setChild" in widget && typeof widget.setChild === "function";

/**
 * Type guard that checks if a GTK widget supports removing children via a remove method.
 */
export const isRemovable = (widget: Gtk.Widget): widget is Removable =>
    "remove" in widget && typeof widget.remove === "function";

/**
 * Type guard that checks if a GTK widget is a FlowBoxChild.
 */
export const isFlowBoxChild = (widget: Gtk.Widget): widget is Gtk.FlowBoxChild =>
    "getIndex" in widget && "getChild" in widget && typeof (widget as Gtk.FlowBoxChild).getIndex === "function";

/**
 * Type guard that checks if a GTK widget is a ListBoxRow.
 */
export const isListBoxRow = (widget: Gtk.Widget): widget is Gtk.ListBoxRow =>
    "getIndex" in widget && "isSelected" in widget && typeof (widget as Gtk.ListBoxRow).getIndex === "function";
