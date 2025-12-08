import type { SortType } from "@gtkx/ffi/gtk";
import type { ReactElement, ReactNode } from "react";

/**
 * Props for slot components that accept children.
 * Used by container widgets that render child elements in designated slots.
 */
export interface SlotProps {
    children?: ReactNode;
}

/**
 * Props passed to list item components.
 * @typeParam I - The type of the data item
 */
export interface ListItemProps<I = unknown> {
    /** The data item to render. */
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
 * Called with null during setup (for loading state) and with the actual item during bind.
 */
export type RenderItemFn<T> = (item: T | null) => ReactElement;

/**
 * Props for ListView and GridView components.
 * @typeParam T - The type of the data items in the list
 */
export interface ListViewRenderProps<T = unknown> {
    /** Render function called for each item in the list. */
    renderItem: RenderItemFn<T>;
}

/**
 * Comparison function for sorting items by column.
 * Returns negative if a < b, 0 if a === b, positive if a > b.
 * @param a - First item to compare
 * @param b - Second item to compare
 * @param columnId - The ID of the column being sorted
 */
export type ColumnSortFn<T, C extends string = string> = (a: T, b: T, columnId: C) => number;

/**
 * Props for individual columns in a ColumnView.
 * @typeParam T - The type of the data items displayed in the column
 */
export interface ColumnViewColumnProps<T = unknown> {
    /** The column header title. */
    title?: string;
    /** Whether the column should expand to fill available space. */
    expand?: boolean;
    /** Whether the column can be resized by the user. */
    resizable?: boolean;
    /** Fixed width in pixels. Overrides automatic sizing. */
    fixedWidth?: number;
    /** Unique identifier for the column. Used for sorting. */
    id?: string;
    /**
     * Render function for column cells.
     * Called with null during setup (for loading state) and with the actual item during bind.
     * Always annotate your callback parameter type to include null, e.g.: `(item: MyItem | null) => ...`
     */
    renderCell: (item: T | null) => ReactElement;
}

/**
 * Props for the ColumnView root component.
 * @typeParam T - The type of the data items in the view
 * @typeParam C - The union type of column IDs
 */
export interface ColumnViewRootProps<T = unknown, C extends string = string> {
    /** The ID of the currently sorted column, or null if unsorted. */
    sortColumn?: C | null;
    /** The current sort direction. */
    sortOrder?: SortType;
    /** Callback fired when the user changes the sort column or order. */
    onSortChange?: (column: C | null, order: SortType) => void;
    /** Custom comparison function for sorting items. */
    sortFn?: ColumnSortFn<T, C>;
}

export interface NotebookPageProps extends SlotProps {
    label: string;
}
