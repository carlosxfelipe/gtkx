import type * as Gtk from "@gtkx/ffi/gtk";
import type { ReactNode } from "react";

export interface SlotProps {
    children?: ReactNode;
}

export interface ListItemProps<I = unknown> {
    item: I;
}

export interface GridChildProps extends SlotProps {
    column?: number;
    row?: number;
    columnSpan?: number;
    rowSpan?: number;
}

export interface ListViewFactoryProps<T = unknown> {
    setup?: () => Gtk.Widget;
    bind?: (widget: Gtk.Widget, item: T) => void;
    unbind?: (widget: Gtk.Widget) => void;
    teardown?: (widget: Gtk.Widget) => void;
}

export interface ColumnViewColumnProps<T = unknown> {
    title?: string;
    expand?: boolean;
    resizable?: boolean;
    fixedWidth?: number;
    setup?: () => Gtk.Widget;
    bind?: (widget: Gtk.Widget, item: T) => void;
    unbind?: (widget: Gtk.Widget) => void;
    teardown?: (widget: Gtk.Widget) => void;
}

export interface NotebookPageProps extends SlotProps {
    label: string;
}
