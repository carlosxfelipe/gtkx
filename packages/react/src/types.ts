import type * as Gtk from "@gtkx/ffi/gtk";
import type { ReactElement, ReactNode, RefCallback } from "react";

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

/**
 * Render function for ListView/GridView items.
 * Called with null during setup/unbind and with the actual item during bind.
 * The ref callback must be attached to the root widget to set it as the list item's child.
 */
export type RenderItemFn<T> = (item: T | null, ref: RefCallback<Gtk.Widget>) => ReactElement;

export interface ListViewRenderProps<T = unknown> {
    renderItem: RenderItemFn<T>;
}

/**
 * Render function for ColumnView cells.
 * Called with null during setup/unbind and with the actual item during bind.
 * The ref callback must be attached to the root widget to set it as the cell's child.
 */
export type RenderCellFn<T> = (item: T | null, ref: RefCallback<Gtk.Widget>) => ReactElement;

export interface ColumnViewColumnProps {
    title?: string;
    expand?: boolean;
    resizable?: boolean;
    fixedWidth?: number;
    // biome-ignore lint/suspicious/noExplicitAny: allows typed renderCell callbacks in JSX
    renderCell: (item: any, ref: RefCallback<Gtk.Widget>) => ReactElement;
}

export interface NotebookPageProps extends SlotProps {
    label: string;
}
