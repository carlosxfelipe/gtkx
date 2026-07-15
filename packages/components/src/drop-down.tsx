import type * as Gio from "@gtkx/gi/gio";
import type * as Gtk from "@gtkx/gi/gtk";
import { GtkDropDown, GtkLabel } from "@gtkx/jsx/gtk";
import { useMergeRefs } from "@gtkx/react/internal";
import { type ElementType, type ReactNode, type Ref, useCallback, useRef, useState } from "react";
import { type CellRenderer, CellRenderHost, HeaderRenderHost, itemRenderer } from "./cell.js";
import { type FactoryInstaller, useCellContainers } from "./hooks/use-cell-containers.js";
import { useDropDownSelection } from "./hooks/use-drop-down-selection.js";
import { useInstalledModel } from "./hooks/use-installed-model.js";
import { useListModel } from "./hooks/use-list-model.js";
import {
    asPolymorphicProps,
    type ItemNode,
    type PolymorphicComponentProps,
    type RenderItemProps,
    type SectionNode,
} from "./types.js";
import type { CellContainerStore } from "./utils/cell-container-store.js";
import type { ItemResolver } from "./utils/item-resolver.js";

interface DropDownWidget extends Gtk.Widget {
    getSelected(): number;
    setSelected(position: number): void;
    setModel(model: Gio.ListModel | null): void;
    setFactory(factory: Gtk.ListItemFactory | null): void;
    setListFactory(factory: Gtk.ListItemFactory | null): void;
    setHeaderFactory(factory: Gtk.ListItemFactory | null): void;
}

export type DropDownItemRenderer<T> = (props: RenderItemProps<T>) => ReactNode;

const itemFactoryInstaller: FactoryInstaller<DropDownWidget> = {
    install: (widget, factory) => widget.setFactory(factory),
    uninstall: (widget) => widget.setFactory(null),
};

const listFactoryInstaller: FactoryInstaller<DropDownWidget> = {
    install: (widget, factory) => widget.setListFactory(factory),
    uninstall: (widget) => widget.setListFactory(null),
};

const headerFactoryInstaller: FactoryInstaller<DropDownWidget> = {
    install: (widget, factory) => widget.setHeaderFactory(factory),
    uninstall: (widget) => widget.setHeaderFactory(null),
};

const defaultRenderer: CellRenderer<unknown, unknown> = (value) => {
    if (value === undefined || value === null) return null;
    return <GtkLabel>{String(value)}</GtkLabel>;
};

const toItemRenderer = <T, S>(renderItem: DropDownItemRenderer<T> | null | undefined): CellRenderer<T, S> => {
    if (typeof renderItem !== "function") return defaultRenderer as CellRenderer<T, S>;
    return itemRenderer<T, S>(renderItem);
};

const toListRenderer = <T, S>(
    renderListItem: DropDownItemRenderer<T> | null | undefined,
    renderItem: DropDownItemRenderer<T> | null | undefined,
): CellRenderer<T, S> => {
    if (typeof renderListItem === "function") return itemRenderer<T, S>(renderListItem);
    return toItemRenderer<T, S>(renderItem);
};

const createSelectionResolver = <T, S>(resolver: ItemResolver<T, S>, selectedPosition: number): ItemResolver<T, S> => ({
    positionOfId: (id) => resolver.positionOfId(id),
    idOf: (position) => resolver.idOf(position),
    resolve: (_position, treeRow) => resolver.resolve(selectedPosition, treeRow),
});

/** Declarative props for {@link DropDown}'s backing collection and cell rendering. */
export type DropDownDeclarativeProps<T = unknown, S = unknown> = {
    items?: ItemNode<T>[] | undefined;
    sections?: SectionNode<S, T>[] | undefined;
    /** Id of the currently selected item, making the selection controlled. */
    selectedId?: string | null | undefined;
    onSelectionChanged?: ((id: string) => void) | null | undefined;
    renderItem?: DropDownItemRenderer<T> | null | undefined;
    /** Renderer for items in the open popup list, falling back to renderItem when omitted. */
    renderListItem?: DropDownItemRenderer<T> | null | undefined;
    /** Renderer for section headers in the popup list. */
    renderHeader?: ((info: { section: S }) => ReactNode) | null | undefined;
};

/**
 * Props for {@link DropDown}. The backing widget is chosen through the `component` prop, defaulting to
 * GtkDropDown, and its own props combine with {@link DropDownDeclarativeProps}.
 */
export type DropDownProps<
    T = unknown,
    S = unknown,
    C extends ElementType = typeof GtkDropDown,
> = PolymorphicComponentProps<
    C,
    DropDownWidget,
    DropDownDeclarativeProps<T, S>,
    "component must render a Gtk.DropDown-like widget",
    "model" | "factory" | "listFactory" | "headerFactory"
>;

interface NormalizedDropDownProps<T, S, W extends DropDownWidget> {
    ref: Ref<W | null> | undefined;
    items: ItemNode<T>[] | undefined;
    sections: SectionNode<S, T>[] | undefined;
    selectedId: string | null | undefined;
    onSelectionChanged: ((id: string) => void) | null | undefined;
    renderHeader: ((info: { section: S }) => ReactNode) | null | undefined;
}

interface DropDownWiring<T, S, W extends DropDownWidget> {
    setRef: (value: W | null) => void;
    resolver: ItemResolver<T, S>;
    selectionResolver: ItemResolver<T, S>;
    headerResolver: ItemResolver<T, S>;
    selectionStore: CellContainerStore;
    listStore: CellContainerStore;
    headerStore: CellContainerStore;
    useHeader: boolean;
}

const useDropDownWiring = <T, S, W extends DropDownWidget>(
    props: NormalizedDropDownProps<T, S, W>,
): DropDownWiring<T, S, W> => {
    const widgetRef = useRef<DropDownWidget | null>(null);
    const [widget, setWidget] = useState<DropDownWidget | null>(null);
    const captureWidget = useCallback((value: W | null) => {
        widgetRef.current = value;
        setWidget(value);
    }, []);
    const setRef = useMergeRefs<W>(props.ref, captureWidget);

    const listModel = useListModel<T, S>({ items: props.items, sections: props.sections });

    const useHeader = typeof props.renderHeader === "function";

    const selectionStore = useCellContainers<DropDownWidget>({ target: widgetRef, installer: itemFactoryInstaller });
    const listStore = useCellContainers<DropDownWidget>({ target: widgetRef, installer: listFactoryInstaller });
    const headerStore = useCellContainers<DropDownWidget>({
        target: useHeader ? widgetRef : null,
        installer: headerFactoryInstaller,
    });

    useInstalledModel(widgetRef, listModel.model, (target, value) => target.setModel(value));

    const selectedPosition = useDropDownSelection<T, S>({
        widget,
        resolver: listModel.resolver,
        selectedId: props.selectedId,
        onSelectionChanged: props.onSelectionChanged,
    });

    const controlledPosition =
        props.selectedId === undefined || props.selectedId === null
            ? -1
            : listModel.resolver.positionOfId(props.selectedId);
    const selectionPosition =
        controlledPosition >= 0 ? controlledPosition : selectedPosition < 0 ? 0 : selectedPosition;

    return {
        setRef,
        resolver: listModel.resolver,
        selectionResolver: createSelectionResolver(listModel.resolver, selectionPosition),
        headerResolver: listModel.headerResolver,
        selectionStore,
        listStore,
        headerStore,
        useHeader,
    };
};

/**
 * Renders a drop-down widget (Gtk.DropDown by default, or the widget given as `component`) backed by a
 * collection model, with customizable rendering for the selected item, the popup list rows, and section
 * headers.
 */
export const DropDown = <T = unknown, S = unknown, C extends ElementType = typeof GtkDropDown>(
    props: DropDownProps<T, S, C>,
): ReactNode => {
    const {
        component,
        ref,
        items,
        sections,
        renderItem,
        renderListItem,
        renderHeader,
        selectedId,
        onSelectionChanged,
        ...intrinsicProps
    } = asPolymorphicProps<DropDownDeclarativeProps<T, S>, DropDownWidget>(props);
    const Component = component ?? GtkDropDown;

    const renderItemFn = renderItem as DropDownItemRenderer<T> | null | undefined;
    const renderListItemFn = renderListItem as DropDownItemRenderer<T> | null | undefined;
    const renderHeaderFn = renderHeader as ((info: { section: S }) => ReactNode) | null | undefined;

    const wiring = useDropDownWiring<T, S, DropDownWidget>({
        ref,
        items: items as ItemNode<T>[] | undefined,
        sections: sections as SectionNode<S, T>[] | undefined,
        selectedId: selectedId as string | null | undefined,
        onSelectionChanged: onSelectionChanged as ((id: string) => void) | null | undefined,
        renderHeader: renderHeaderFn,
    });

    return (
        <>
            <Component {...intrinsicProps} ref={wiring.setRef} />
            <CellRenderHost
                store={wiring.selectionStore}
                resolver={wiring.selectionResolver}
                render={toItemRenderer<T, S>(renderItemFn)}
            />
            <CellRenderHost
                store={wiring.listStore}
                resolver={wiring.resolver}
                render={toListRenderer<T, S>(renderListItemFn, renderItemFn)}
            />
            <HeaderRenderHost
                useHeader={wiring.useHeader}
                store={wiring.headerStore}
                resolver={wiring.headerResolver}
                renderHeader={renderHeaderFn}
            />
        </>
    );
};
