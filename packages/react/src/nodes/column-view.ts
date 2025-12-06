import { getObject, getObjectId } from "@gtkx/ffi";
import type * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import type Reconciler from "react-reconciler";
import type { Props } from "../factory.js";
import { createFiberRoot, updateSync } from "../flush-sync.js";
import { Node } from "../node.js";
import type { RenderCellFn } from "../types.js";

export class ColumnViewNode extends Node<Gtk.ColumnView> {
    static matches(type: string): boolean {
        return type === "ColumnView.Root";
    }

    private stringList: Gtk.StringList;
    private selectionModel: Gtk.SingleSelection;
    private items: unknown[] = [];
    private columns: ColumnViewColumnNode[] = [];

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

    addItem(item: unknown): void {
        this.items.push(item);
        this.stringList.append("");
    }

    insertItemBefore(item: unknown, beforeItem: unknown): void {
        const beforeIndex = this.items.indexOf(beforeItem);

        if (beforeIndex === -1) {
            this.addItem(item);
            return;
        }

        this.items.splice(beforeIndex, 0, item);
        this.stringList.splice(beforeIndex, 0, [""]);
    }

    removeItem(item: unknown): void {
        const index = this.items.indexOf(item);

        if (index !== -1) {
            this.items.splice(index, 1);
            this.stringList.remove(index);
        }
    }
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
    private renderCell: RenderCellFn<unknown>;
    private columnView: ColumnViewNode | null = null;
    private fiberRoots = new Map<number, Reconciler.FiberRoot>();

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);

        this.factory = new Gtk.SignalListItemFactory();
        this.gtkColumn = new Gtk.ColumnViewColumn(props.title as string | undefined, this.factory);

        this.renderCell = props.renderCell as RenderCellFn<unknown>;

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
            const listItem = getObject(listItemObj, Gtk.ListItem);
            const id = getObjectId(listItemObj);

            const fiberRoot = createFiberRoot();
            this.fiberRoots.set(id, fiberRoot);

            let rootWidget: Gtk.Widget | null = null;
            const ref = (widget: Gtk.Widget | null) => {
                if (widget && !rootWidget) {
                    rootWidget = widget;
                    listItem.setChild(widget);
                }
            };

            const element = this.renderCell(null, ref);
            updateSync(element, fiberRoot);
        });

        this.factory.connect("bind", (_self, listItemObj) => {
            const listItem = getObject(listItemObj, Gtk.ListItem);
            const id = getObjectId(listItemObj);
            const fiberRoot = this.fiberRoots.get(id);
            if (!fiberRoot) return;

            const position = listItem.getPosition();

            if (this.columnView) {
                const items = this.columnView.getItems();
                const item = items[position];

                const ref = () => {};
                const element = this.renderCell(item ?? null, ref);
                updateSync(element, fiberRoot);
            }
        });

        this.factory.connect("unbind", (_self, listItemObj) => {
            const id = getObjectId(listItemObj);
            const fiberRoot = this.fiberRoots.get(id);
            if (!fiberRoot) return;

            const ref = () => {};
            const element = this.renderCell(null, ref);
            updateSync(element, fiberRoot);
        });

        this.factory.connect("teardown", (_self, listItemObj) => {
            const id = getObjectId(listItemObj);
            const fiberRoot = this.fiberRoots.get(id);
            if (!fiberRoot) return;

            updateSync(null, fiberRoot);
            this.fiberRoots.delete(id);
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
            this.renderCell = newProps.renderCell as RenderCellFn<unknown>;
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
