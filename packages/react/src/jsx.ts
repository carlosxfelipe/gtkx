import type * as Gtk from "@gtkx/ffi/gtk";
import type { ReactElement, ReactNode } from "react";
import { createElement } from "react";
import type { RenderItemFn } from "./nodes/internal/list-item-renderer.js";

/**
 * Props for slot-based child positioning.
 *
 * @see {@link Slot} for type-safe slot usage
 */
export type SlotProps = {
    /** The slot identifier */
    id?: string;
    /** Content to place in the slot */
    children?: ReactNode;
};

/**
 * Props for items in a {@link ListView} or {@link GridView}.
 *
 * @typeParam T - The type of data associated with this list item
 */
export type ListItemProps<T = unknown> = {
    /** Unique identifier for this item */
    id: string;
    /** The data value for this item */
    value: T;
};

/**
 * Props for string-based list items.
 *
 * Use with `SimpleListItem` for simple string lists.
 */
export type StringListItemProps = {
    /** Unique identifier for this item */
    id: string;
    /** The string value for this item */
    value: string;
};

/**
 * Props for positioning children within a GtkGrid.
 *
 * @see {@link GridChild} for usage
 */
export type GridChildProps = SlotProps & {
    /** Column index (0-based) */
    column?: number;
    /** Row index (0-based) */
    row?: number;
    /** Number of columns to span */
    columnSpan?: number;
    /** Number of rows to span */
    rowSpan?: number;
};

/**
 * Props for custom list view rendering.
 *
 * @typeParam T - The type of items in the list
 */
export type ListViewRenderProps<T = unknown> = {
    /** Function to render each list item */
    renderItem: RenderItemFn<T>;
};

/**
 * Props for defining a column in a ColumnView (table).
 *
 * @typeParam T - The type of data for each row
 *
 * @see {@link ColumnViewColumn} for usage
 */
export type ColumnViewColumnProps<T = unknown> = {
    /** Column header text */
    title: string;
    /** Whether the column expands to fill available space */
    expand?: boolean;
    /** Whether the column can be resized by the user */
    resizable?: boolean;
    /** Fixed width in pixels */
    fixedWidth?: number;
    /** Unique identifier for this column */
    id: string;
    /** Whether clicking the header sorts by this column */
    sortable?: boolean;
    /** Function to render the cell content for each row */
    renderCell: (item: T | null) => ReactElement;
};

/**
 * Props for the root ColumnView component.
 *
 * @typeParam C - String literal type for column IDs
 */
export type ColumnViewRootProps<C extends string = string> = {
    /** Currently sorted column ID, or null for no sorting */
    sortColumn?: C | null;
    /** Sort direction (ascending or descending) */
    sortOrder?: Gtk.SortType;
    /** Callback when sort changes */
    onSortChange?: (column: C | null, order: Gtk.SortType) => void;
};

/**
 * Props for notebook (tabbed) pages.
 */
export type NotebookPageProps = SlotProps & {
    /** Tab label text */
    label: string;
};

/**
 * Props for the root Stack component.
 */
export type StackRootProps = SlotProps & {
    /** Name of the currently visible child page */
    visibleChildName?: string;
};

/**
 * Props for pages within a Stack or ViewStack.
 *
 * @see {@link StackPage} for usage
 */
export type StackPageProps = SlotProps & {
    /** Unique name for this page (used with visibleChildName) */
    name?: string;
    /** Display title shown in stack switchers */
    title?: string;
    /** Icon name from the icon theme */
    iconName?: string;
    /** Whether to show an attention indicator */
    needsAttention?: boolean;
    /** Whether this page is visible in switchers */
    visible?: boolean;
    /** Whether underscores in title indicate mnemonics */
    useUnderline?: boolean;
    /** Badge number shown on the page indicator */
    badgeNumber?: number;
};

/**
 * Props for menu items.
 *
 * @see {@link Menu} for building menus
 */
export type MenuItemProps = {
    /** Unique identifier for this menu item */
    id: string;
    /** Display label */
    label: string;
    /** Callback when the item is activated */
    onActivate: () => void;
    /** Keyboard accelerator(s) (e.g., "\<Control\>q") */
    accels?: string | string[];
};

/**
 * Props for menu sections.
 *
 * Sections group related menu items with optional labels.
 */
export type MenuSectionProps = {
    /** Optional section header label */
    label?: string;
    /** Menu items in this section */
    children?: ReactNode;
};

/**
 * Props for submenus.
 */
export type MenuSubmenuProps = {
    /** Submenu label */
    label: string;
    /** Menu items in this submenu */
    children?: ReactNode;
};

/**
 * Props for children within an Overlay container.
 */
export type OverlayChildProps = SlotProps & {
    /** Whether to include this child in size measurement */
    measure?: boolean;
    /** Whether to clip this overlay child to the main child bounds */
    clipOverlay?: boolean;
};

export type { WidgetSlotNames } from "./generated/jsx.js";

export function Slot<W extends keyof import("./generated/jsx.js").WidgetSlotNames>(props: {
    for: W;

    id: import("./generated/jsx.js").WidgetSlotNames[W];
    children?: ReactNode;
}): ReactElement {
    return createElement("Slot", { id: props.id }, props.children);
}

export const StackPage = "StackPage" as const;

export const GridChild = "GridChild" as const;

export const NotebookPage = "NotebookPage" as const;

export const ListItem = "ListItem" as const;

export function ColumnViewColumn<T = unknown>(props: ColumnViewColumnProps<T>): ReactElement {
    return createElement("ColumnViewColumn", props);
}

export type ListViewProps<T = unknown> = Omit<import("./generated/jsx.js").GtkListViewProps, "renderItem"> & {
    renderItem: (item: T | null) => ReactElement;
};

export function ListView<T = unknown>(props: ListViewProps<T>): ReactElement {
    return createElement("GtkListView", props);
}

export type GridViewProps<T = unknown> = Omit<import("./generated/jsx.js").GtkGridViewProps, "renderItem"> & {
    renderItem: (item: T | null) => ReactElement;
};

export function GridView<T = unknown>(props: GridViewProps<T>): ReactElement {
    return createElement("GtkGridView", props);
}

export const SimpleListItem = "SimpleListItem" as const;

export const Pack = {
    Start: "Pack.Start" as const,
    End: "Pack.End" as const,
};

export const Toolbar = {
    Top: "Toolbar.Top" as const,
    Bottom: "Toolbar.Bottom" as const,
};

export const Overlay = "Overlay" as const;

export const OverlayChild = "OverlayChild" as const;

export const Menu = {
    Item: "Menu.Item" as const,
    Section: "Menu.Section" as const,
    Submenu: "Menu.Submenu" as const,
};

declare global {
    namespace React {
        namespace JSX {
            interface IntrinsicElements {
                StackPage: StackPageProps;

                GridChild: GridChildProps;

                NotebookPage: NotebookPageProps;

                ListItem: ListItemProps;

                // biome-ignore lint/suspicious/noExplicitAny: Required for contravariant behavior
                ColumnViewColumn: ColumnViewColumnProps<any>;
                SimpleListItem: StringListItemProps;

                "Pack.Start": SlotProps;
                "Pack.End": SlotProps;

                "Toolbar.Top": SlotProps;
                "Toolbar.Bottom": SlotProps;

                OverlayChild: OverlayChildProps;

                "Menu.Item": MenuItemProps;
                "Menu.Section": MenuSectionProps;
                "Menu.Submenu": MenuSubmenuProps;
            }
        }
    }
}

export * from "./generated/jsx.js";
