import type * as Gtk from "@gtkx/gi/gtk";
import type { ComponentPropsWithRef, ElementType } from "react";

/** Props of a container's Child component: the widget to render, its own props, and any placement props. */
export type ChildProps<C extends ElementType, Placement = unknown> = Placement & {
    component: C;
} & Omit<ComponentPropsWithRef<C>, keyof Placement>;

/** Props of a component whose backing widget defaults to one type but can be swapped through `component`. */
export type WidgetProps<C extends ElementType, Own = unknown, ExtraOmit extends string = never> = Own & {
    component?: C;
} & Omit<ComponentPropsWithRef<C>, ExtraOmit | keyof Own>;

/**
 * A single item in a collection model, identified by a stable id and holding an
 * arbitrary value. Nested items form a tree.
 */
export type ItemNode<T = unknown> = {
    /** Stable identifier used to track the item across updates and selection. */
    id: string;
    value: T;
    children?: ItemNode<T>[] | undefined;
    /** Hides the tree expander arrow even when the item has children. */
    hideExpander?: boolean | undefined;
    /** Adds indentation matching the item's depth in the tree. */
    indentForDepth?: boolean | undefined;
    /** Reserves indentation space for an expander icon. */
    indentForIcon?: boolean | undefined;
};

/** A group of items rendered under a shared section header. */
export type SectionNode<S = unknown, T = unknown> = {
    /** Stable identifier used to track the section across updates. */
    id: string;
    value: S;
    /** Items belonging to this section. */
    data: ItemNode<T>[];
};

/** Props passed to a renderItem callback when rendering one cell. */
export type RenderItemProps<T> = {
    item: T;
    index: number;
    /** Depth of the item within a tree, starting at zero for top-level items. */
    depth?: number | undefined;
    /** Whether the item is currently expanded in a tree view. */
    isExpanded?: boolean | undefined;
};

export type CollectionItemSizeProps = {
    estimatedItemHeight?: number | undefined;
    estimatedItemWidth?: number | undefined;
};

export type ControlledSelectionProps = {
    selectedIds?: string[] | null | undefined;
    onSelectionChanged?: ((ids: string[]) => void) | null | undefined;
    selectionMode?: Gtk.SelectionMode | null | undefined;
};

export type ControlledExpansionProps = {
    expandedIds?: string[] | null | undefined;
    onExpandedChange?: ((ids: string[]) => void) | null | undefined;
};

/** Declarative description of a single menu item, optionally nesting a submenu or section. */
export type MenuEntry = {
    /** Text shown for the item. */
    label?: string | undefined;
    /** Action name activated when the item is chosen, for example "app.quit". */
    action?: string | undefined;
    /** Nested entries shown as a submenu opened from this item. */
    submenu?: MenuEntry[] | undefined;
    /** Nested entries grouped as a visually separated section. */
    section?: MenuEntry[] | undefined;
};
