import { wrapPtr } from "@gtkx/ffi";
import type * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

type SetupFn = () => Gtk.Widget;
type BindFn = (widget: Gtk.Widget, item: unknown) => void;
type UnbindFn = (widget: Gtk.Widget) => void;
type TeardownFn = (widget: Gtk.Widget) => void;

export class ListViewNode extends Node<Gtk.ListView | Gtk.GridView> {
    static matches(type: string): boolean {
        return type === "ListView.Root" || type === "GridView.Root";
    }

    private stringList: Gtk.StringList;
    private selectionModel: Gtk.SingleSelection;
    private factory: Gtk.SignalListItemFactory;
    private items: unknown[] = [];
    private setup: SetupFn | null = null;
    private bind: BindFn | null = null;
    private unbind: UnbindFn | null = null;
    private teardown: TeardownFn | null = null;

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);

        this.stringList = new Gtk.StringList([]);
        this.selectionModel = new Gtk.SingleSelection(this.stringList as unknown as Gio.ListModel);
        this.factory = new Gtk.SignalListItemFactory();

        this.setup = props.setup as SetupFn | null;
        this.bind = props.bind as BindFn | null;
        this.unbind = props.unbind as UnbindFn | null;
        this.teardown = props.teardown as TeardownFn | null;

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
            const item = this.items[position];
            const child = listItem.getChild();

            if (this.bind && child && item !== undefined) {
                this.bind(child, item);
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

        this.widget.setModel(this.selectionModel);
        this.widget.setFactory(this.factory);
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

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();
        consumed.add("setup");
        consumed.add("bind");
        consumed.add("unbind");
        consumed.add("teardown");
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

        super.updateProps(oldProps, newProps);
    }
}

export class ListItemNode extends Node {
    static matches(type: string): boolean {
        return type === "ListView.Item" || type === "GridView.Item";
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
        if (parent instanceof ListViewNode) {
            parent.addItem(this.item);
        }
    }

    override attachToParentBefore(parent: Node, before: Node): void {
        if (parent instanceof ListViewNode && before instanceof ListItemNode) {
            parent.insertItemBefore(this.item, before.getItem());
        } else {
            this.attachToParent(parent);
        }
    }

    override detachFromParent(parent: Node): void {
        if (parent instanceof ListViewNode) {
            parent.removeItem(this.item);
        }
    }
}
