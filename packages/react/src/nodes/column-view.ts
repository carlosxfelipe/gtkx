import { getObject, getObjectId } from "@gtkx/ffi";
import type * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import type Reconciler from "react-reconciler";
import { scheduleFlush } from "../batch.js";
import type { Props } from "../factory.js";
import { createFiberRoot } from "../fiber-root.js";
import { Node } from "../node.js";
import { reconciler } from "../reconciler.js";
import type { RenderItemFn } from "../types.js";

export class ColumnViewNode extends Node<Gtk.ColumnView> {
    static matches(type: string): boolean {
        return type === "ColumnView.Root";
    }

    private stringList: Gtk.StringList;
    private selectionModel: Gtk.SingleSelection;
    private items: unknown[] = [];
    private columns: ColumnViewColumnNode[] = [];
    private committedLength = 0;

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);

        this.stringList = new Gtk.StringList([]);
        this.selectionModel = new Gtk.SingleSelection(this.stringList as unknown as Gio.ListModel);
        this.widget.setModel(this.selectionModel);
    }

    getItems(): unknown[] {
        return this.items;
    }

    addColumn(column: ColumnViewColumnNode): void {
        this.columns.push(column);
        const gtkColumn = column.getGtkColumn();
        this.widget.appendColumn(gtkColumn);
        column.setColumnView(this);
    }

    removeColumn(column: ColumnViewColumnNode): void {
        const index = this.columns.indexOf(column);
        if (index !== -1) {
            this.columns.splice(index, 1);
            this.widget.removeColumn(column.getGtkColumn());
            column.setColumnView(null);
        }
    }

    insertColumnBefore(column: ColumnViewColumnNode, before: ColumnViewColumnNode): void {
        const beforeIndex = this.columns.indexOf(before);
        if (beforeIndex === -1) {
            this.addColumn(column);
            return;
        }

        this.columns.splice(beforeIndex, 0, column);
        this.widget.insertColumn(beforeIndex, column.getGtkColumn());
        column.setColumnView(this);
    }

    private syncStringList = (): void => {
        const newLength = this.items.length;
        if (newLength === this.committedLength) return;

        const placeholders = Array.from({ length: newLength }, () => "");
        this.stringList.splice(0, this.committedLength, placeholders);
        this.committedLength = newLength;
    };

    addItem(item: unknown): void {
        this.items.push(item);
        scheduleFlush(this.syncStringList);
    }

    insertItemBefore(item: unknown, beforeItem: unknown): void {
        const beforeIndex = this.items.indexOf(beforeItem);

        if (beforeIndex === -1) {
            this.items.push(item);
        } else {
            this.items.splice(beforeIndex, 0, item);
        }

        scheduleFlush(this.syncStringList);
    }

    removeItem(item: unknown): void {
        const index = this.items.indexOf(item);

        if (index !== -1) {
            this.items.splice(index, 1);
            scheduleFlush(this.syncStringList);
        }
    }
}

interface ListItemInfo {
    box: Gtk.Box;
    fiberRoot: Reconciler.FiberRoot;
}

export class ColumnViewColumnNode extends Node {
    static matches(type: string): boolean {
        return type === "ColumnView.Column";
    }

    protected override isVirtual(): boolean {
        return true;
    }

    private gtkColumn: Gtk.ColumnViewColumn;
    private factory: Gtk.SignalListItemFactory;
    private renderCell: RenderItemFn<unknown>;
    private columnView: ColumnViewNode | null = null;
    private listItemCache = new Map<number, ListItemInfo>();

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);

        this.factory = new Gtk.SignalListItemFactory();
        this.gtkColumn = new Gtk.ColumnViewColumn(props.title as string | undefined, this.factory);

        this.renderCell = props.renderCell as RenderItemFn<unknown>;

        if (props.expand !== undefined) {
            this.gtkColumn.setExpand(props.expand as boolean);
        }

        if (props.resizable !== undefined) {
            this.gtkColumn.setResizable(props.resizable as boolean);
        }

        if (props.fixedWidth !== undefined) {
            this.gtkColumn.setFixedWidth(props.fixedWidth as number);
        }

        this.factory.connect("setup", (_self, listItemObj) => {
            const listItem = getObject(listItemObj.ptr, Gtk.ListItem);
            const id = getObjectId(listItemObj.ptr);

            const box = new Gtk.Box(Gtk.Orientation.VERTICAL, 0);
            listItem.setChild(box);

            const fiberRoot = createFiberRoot(box);
            this.listItemCache.set(id, { box, fiberRoot });

            const element = this.renderCell(null);
            reconciler.getInstance().updateContainer(element, fiberRoot, null, () => {});
        });

        this.factory.connect("bind", (_self, listItemObj) => {
            const listItem = getObject(listItemObj.ptr, Gtk.ListItem);
            const id = getObjectId(listItemObj.ptr);
            const info = this.listItemCache.get(id);

            if (!info) return;

            const position = listItem.getPosition();

            if (this.columnView) {
                const items = this.columnView.getItems();
                const item = items[position];
                const element = this.renderCell(item ?? null);
                reconciler.getInstance().updateContainer(element, info.fiberRoot, null, () => {});
            }
        });

        this.factory.connect("unbind", (_self, listItemObj) => {
            const id = getObjectId(listItemObj.ptr);
            const info = this.listItemCache.get(id);

            if (!info) return;

            reconciler.getInstance().updateContainer(null, info.fiberRoot, null, () => {});
        });

        this.factory.connect("teardown", (_self, listItemObj) => {
            const id = getObjectId(listItemObj.ptr);
            const info = this.listItemCache.get(id);

            if (info) {
                reconciler.getInstance().updateContainer(null, info.fiberRoot, null, () => {});
                this.listItemCache.delete(id);
            }
        });
    }

    getGtkColumn(): Gtk.ColumnViewColumn {
        return this.gtkColumn;
    }

    setColumnView(columnView: ColumnViewNode | null): void {
        this.columnView = columnView;
    }

    override attachToParent(parent: Node): void {
        if (parent instanceof ColumnViewNode) {
            parent.addColumn(this);
        }
    }

    override attachToParentBefore(parent: Node, before: Node): void {
        if (parent instanceof ColumnViewNode && before instanceof ColumnViewColumnNode) {
            parent.insertColumnBefore(this, before);
        } else {
            this.attachToParent(parent);
        }
    }

    override detachFromParent(parent: Node): void {
        if (parent instanceof ColumnViewNode) {
            parent.removeColumn(this);
        }
    }

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();
        consumed.add("renderCell");
        consumed.add("title");
        consumed.add("expand");
        consumed.add("resizable");
        consumed.add("fixedWidth");
        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        if (oldProps.renderCell !== newProps.renderCell) {
            this.renderCell = newProps.renderCell as RenderItemFn<unknown>;
        }

        if (!this.gtkColumn) return;

        if (oldProps.title !== newProps.title) {
            this.gtkColumn.setTitle(newProps.title as string | undefined);
        }
        if (oldProps.expand !== newProps.expand) {
            this.gtkColumn.setExpand(newProps.expand as boolean);
        }
        if (oldProps.resizable !== newProps.resizable) {
            this.gtkColumn.setResizable(newProps.resizable as boolean);
        }
        if (oldProps.fixedWidth !== newProps.fixedWidth) {
            this.gtkColumn.setFixedWidth(newProps.fixedWidth as number);
        }
    }
}

export class ColumnViewItemNode extends Node {
    static matches(type: string): boolean {
        return type === "ColumnView.Item";
    }

    protected override isVirtual(): boolean {
        return true;
    }

    private item: unknown;

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);
        this.item = props.item as unknown;
    }

    getItem(): unknown {
        return this.item;
    }

    override attachToParent(parent: Node): void {
        if (parent instanceof ColumnViewNode) {
            parent.addItem(this.item);
        }
    }

    override attachToParentBefore(parent: Node, before: Node): void {
        if (parent instanceof ColumnViewNode && before instanceof ColumnViewItemNode) {
            parent.insertItemBefore(this.item, before.getItem());
        } else {
            this.attachToParent(parent);
        }
    }

    override detachFromParent(parent: Node): void {
        if (parent instanceof ColumnViewNode) {
            parent.removeItem(this.item);
        }
    }
}
