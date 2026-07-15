import type * as Gtk from "@gtkx/gi/gtk";
import type { ComponentProps, ComponentPropsWithRef, ElementType, Ref } from "react";

/** The widget instance a component exposes through its ref prop. */
export type WidgetOf<C extends ElementType> =
    ComponentProps<C> extends { ref?: Ref<infer W | null> | undefined } ? W : never;

export type PolymorphicBody<C extends ElementType, Own, ExtraOmit extends string> = Own &
    Omit<ComponentPropsWithRef<C>, ExtraOmit | keyof Own>;

type ValidComponent<C extends ElementType, Widget extends Gtk.Widget> = [WidgetOf<C>] extends [never]
    ? never
    : WidgetOf<C> extends Widget
      ? C
      : never;

export type PolymorphicChildProps<C extends ElementType, Own = unknown> = {
    component: ValidComponent<C, Gtk.Widget>;
} & PolymorphicBody<C, Own, never>;

export type PolymorphicComponentProps<
    C extends ElementType,
    Widget extends Gtk.Widget,
    Own,
    ExtraOmit extends string = never,
> = {
    component?: ValidComponent<C, Widget>;
} & PolymorphicBody<C, Own, ExtraOmit>;

export type PolymorphicRuntimeProps<Own = unknown, W extends Gtk.Widget = Gtk.Widget> = Own & {
    component: ElementType;
    ref?: Ref<W | null> | undefined;
    [key: string]: unknown;
};

export const asPolymorphicProps = <Own = unknown, W extends Gtk.Widget = Gtk.Widget>(
    props: unknown,
): PolymorphicRuntimeProps<Own, W> => props as PolymorphicRuntimeProps<Own, W>;

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
