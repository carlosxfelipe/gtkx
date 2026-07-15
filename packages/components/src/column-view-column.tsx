import type * as Gtk from "@gtkx/gi/gtk";
import { GtkColumnViewColumn, type GtkColumnViewColumnProps } from "@gtkx/jsx/gtk";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { type CellRenderer, CellRenderHost, itemRenderer, type TreeRenderContext } from "./cell.js";
import { type FactoryInstaller, useCellContainers } from "./hooks/use-cell-containers.js";
import { useHeaderMenu } from "./hooks/use-header-menu.js";
import type { RenderItemProps } from "./types.js";
import type { ItemResolver } from "./utils/item-resolver.js";

const factoryInstaller: FactoryInstaller<Gtk.ColumnViewColumn> = {
    install: (column, factory) => column.setFactory(factory),
    uninstall: (column) => column.setFactory(null),
};

export type ColumnDefDeclarativeProps<T = unknown> = {
    title: string;
    expand?: boolean | undefined;
    resizable?: boolean | undefined;
    fixedWidth?: number | undefined;
    id: string;
    sortable?: boolean | undefined;
    visible?: boolean | undefined;
    renderCell: (props: RenderItemProps<T>) => ReactNode;
    headerMenu?: ReactNode;
};

export type ColumnDef<T = unknown> = Omit<GtkColumnViewColumnProps, "factory" | "sorter"> &
    ColumnDefDeclarativeProps<T>;

type ColumnViewColumnProps<T = unknown> = ColumnDef<T> & {
    resolver: ItemResolver<unknown, unknown>;
    tree: TreeRenderContext;
    estimatedItemHeight?: number | undefined;
    onInstance: (id: string, column: Gtk.ColumnViewColumn | null) => void;
};

export const ColumnViewColumn = <T = unknown>(props: ColumnViewColumnProps<T>): ReactNode => {
    const {
        id,
        title,
        sortable,
        renderCell,
        headerMenu,
        resolver,
        tree,
        estimatedItemHeight,
        onInstance,
        ...intrinsicProps
    } = props as ColumnViewColumnProps<T> & { [key: string]: unknown };
    const [column, setColumn] = useState<Gtk.ColumnViewColumn | null>(null);

    const captureColumn = useRef((value: Gtk.ColumnViewColumn | null) => {
        setColumn(value);
    }).current;

    const store = useCellContainers<Gtk.ColumnViewColumn>({
        target: column,
        installer: factoryInstaller,
        estimatedHeight: estimatedItemHeight,
    });

    const onInstanceRef = useRef(onInstance);
    onInstanceRef.current = onInstance;

    useLayoutEffect(() => {
        if (column === null) return;
        onInstanceRef.current(id, column);
        return () => onInstanceRef.current(id, null);
    }, [column, id]);

    const headerMenuPortal = useHeaderMenu(column, headerMenu);

    const cellRenderer: CellRenderer<unknown, unknown> = itemRenderer<unknown, unknown>(
        (cellProps) => renderCell({ ...cellProps, item: cellProps.item as T }),
        tree,
    );

    return (
        <>
            <GtkColumnViewColumn {...intrinsicProps} id={id} title={title} ref={captureColumn} />
            <CellRenderHost store={store} resolver={resolver} render={cellRenderer} />
            {headerMenuPortal}
        </>
    );
};
