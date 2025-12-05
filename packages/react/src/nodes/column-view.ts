import { wrapPtr } from "@gtkx/ffi";
import type * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

type SetupFn = () => Gtk.Widget;
type BindFn = (widget: Gtk.Widget, item: unknown) => void;
type UnbindFn = (widget: Gtk.Widget) => void;
type TeardownFn = (widget: Gtk.Widget) => void;

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
    private setup: SetupFn | null = null;
    private bind: BindFn | null = null;
    private unbind: UnbindFn | null = null;
    private teardown: TeardownFn | null = null;
    private columnView: ColumnViewNode | null = null;

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);

        this.factory = new Gtk.SignalListItemFactory();
        this.gtkColumn = new Gtk.ColumnViewColumn(props.title as string | undefined, this.factory);

        this.setup = props.setup as SetupFn | null;
        this.bind = props.bind as BindFn | null;
        this.unbind = props.unbind as UnbindFn | null;
        this.teardown = props.teardown as TeardownFn | null;

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
            const listItem = wrapPtr(listItemObj, Gtk.ListItem);

            if (this.setup) {
                const widget = this.setup();
                listItem.setChild(widget);
            }
        });

        this.factory.connect("bind", (_self, listItemObj) => {
            const listItem = wrapPtr(listItemObj, Gtk.ListItem);
            const position = listItem.getPosition();
            const child = listItem.getChild();

            if (this.bind && child && this.columnView) {
                const items = this.columnView.getItems();
                const item = items[position];
                if (item !== undefined) {
                    this.bind(child, item);
                }
            }
        });

        this.factory.connect("unbind", (_self, listItemObj) => {
            const listItem = wrapPtr(listItemObj, Gtk.ListItem);
            const child = listItem.getChild();

            if (this.unbind && child) {
                this.unbind(child);
            }
        });

        this.factory.connect("teardown", (_self, listItemObj) => {
            const listItem = wrapPtr(listItemObj, Gtk.ListItem);
            const child = listItem.getChild();

            if (this.teardown && child) {
                this.teardown(child);
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
        consumed.add("setup");
        consumed.add("bind");
        consumed.add("unbind");
        consumed.add("teardown");
        consumed.add("title");
        consumed.add("expand");
        consumed.add("resizable");
        consumed.add("fixedWidth");
        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        if (oldProps.setup !== newProps.setup) {
            this.setup = newProps.setup as SetupFn | null;
        }
        if (oldProps.bind !== newProps.bind) {
            this.bind = newProps.bind as BindFn | null;
        }
        if (oldProps.unbind !== newProps.unbind) {
            this.unbind = newProps.unbind as UnbindFn | null;
        }
        if (oldProps.teardown !== newProps.teardown) {
            this.teardown = newProps.teardown as TeardownFn | null;
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
