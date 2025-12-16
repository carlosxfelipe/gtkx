import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "./node.js";

const createContainerGuard =
    <T>(requiredMethods: (keyof T)[]) =>
    (node: Node): node is Node & T =>
        requiredMethods.every((method) => method in node);

/**
 * Type for containers that manage child widgets with attach/detach semantics.
 * Used by ActionBar, FlowBox, ListBox, Overlay.
 */
export type ChildContainer = {
    attachChild(child: Gtk.Widget): void;
    insertChildBefore(child: Gtk.Widget, before: Gtk.Widget): void;
    detachChild(child: Gtk.Widget): void;
};

/**
 * Type for page-based containers like Notebook.
 */
export type PageContainer = {
    addPage(child: Gtk.Widget, label: string): void;
    insertPageBefore(child: Gtk.Widget, label: string, beforeChild: Gtk.Widget): void;
    removePage(child: Gtk.Widget): void;
    updatePageLabel(child: Gtk.Widget, label: string): void;
};

/**
 * Props for Stack pages.
 * Used by Gtk.Stack and Adw.ViewStack.
 */
export type StackPageProps = {
    name?: string;
    title?: string;
    iconName?: string;
    needsAttention?: boolean;
    visible?: boolean;
    useUnderline?: boolean;
    badgeNumber?: number;
};

/**
 * Type for Stack containers.
 */
export type StackPageContainer = {
    addStackPage(child: Gtk.Widget, props: StackPageProps): void;
    insertStackPageBefore(child: Gtk.Widget, props: StackPageProps, beforeChild: Gtk.Widget): void;
    removeStackPage(child: Gtk.Widget): void;
    updateStackPageProps(child: Gtk.Widget, props: StackPageProps): void;
};

/**
 * Type for grid-based containers.
 */
export type GridContainer = {
    attachToGrid(child: Gtk.Widget, column: number, row: number, colSpan: number, rowSpan: number): void;
    removeFromGrid(child: Gtk.Widget): void;
};

/**
 * Type for item-based containers like ListView, GridView, ColumnView.
 * Items are identified by string IDs for selection support.
 */
export type ItemContainer<T> = {
    addItem(id: string, item: T): void;
    insertItemBefore(id: string, item: T, beforeId: string): void;
    removeItem(id: string): void;
    updateItem(id: string, item: T): void;
};

/**
 * Type for column-based containers like ColumnView.
 * Note: Column type is generic to support both raw Gtk.ColumnViewColumn and wrapper nodes.
 */
export type ColumnContainer = {
    addColumn(column: unknown): void;
    insertColumnBefore(column: unknown, beforeColumn: unknown): void;
    removeColumn(column: unknown): void;
    getItems(): unknown[];
};

export const isChildContainer = createContainerGuard<ChildContainer>([
    "attachChild",
    "detachChild",
    "insertChildBefore",
]);

export const isPageContainer = createContainerGuard<PageContainer>([
    "addPage",
    "removePage",
    "insertPageBefore",
    "updatePageLabel",
]);

export const isStackPageContainer = createContainerGuard<StackPageContainer>([
    "addStackPage",
    "removeStackPage",
    "updateStackPageProps",
]);

export const isGridContainer = createContainerGuard<GridContainer>(["attachToGrid", "removeFromGrid"]);

export const isItemContainer = createContainerGuard<ItemContainer<unknown>>([
    "addItem",
    "insertItemBefore",
    "removeItem",
    "updateItem",
]);

export const isColumnContainer = createContainerGuard<ColumnContainer>(["addColumn", "removeColumn", "getItems"]);

/**
 * Type for containers that support packStart/packEnd semantics.
 * Used by HeaderBar, ActionBar.
 */
export type PackContainer = {
    packStart(child: Gtk.Widget): void;
    packEnd(child: Gtk.Widget): void;
    removeFromPack(child: Gtk.Widget): void;
};

export const isPackContainer = createContainerGuard<PackContainer>(["packStart", "packEnd", "removeFromPack"]);
