import { getObject, getObjectId } from "@gtkx/ffi";
import type * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import type Reconciler from "react-reconciler";
import type { Props } from "../factory.js";
import { createFiberRoot, updateSync } from "../flush-sync.js";
import { Node } from "../node.js";
import type { RenderItemFn } from "../types.js";

export class ListViewNode extends Node<Gtk.ListView | Gtk.GridView> {
    static matches(type: string): boolean {
        return type === "ListView.Root" || type === "GridView.Root";
    }

    private stringList: Gtk.StringList;
    private selectionModel: Gtk.SingleSelection;
    private factory: Gtk.SignalListItemFactory;
    private items: unknown[] = [];
    private renderItem: RenderItemFn<unknown>;
    private fiberRoots = new Map<number, Reconciler.FiberRoot>();

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);

        this.stringList = new Gtk.StringList([]);
        this.selectionModel = new Gtk.SingleSelection(this.stringList as unknown as Gio.ListModel);
        this.factory = new Gtk.SignalListItemFactory();

        this.renderItem = props.renderItem as RenderItemFn<unknown>;

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

            const element = this.renderItem(null, ref);
            updateSync(element, fiberRoot);
        });

        this.factory.connect("bind", (_self, listItemObj) => {
            const listItem = getObject(listItemObj, Gtk.ListItem);
            const id = getObjectId(listItemObj);
            const fiberRoot = this.fiberRoots.get(id);
            if (!fiberRoot) return;

            const position = listItem.getPosition();
            const item = this.items[position];

            const ref = () => {};
            const element = this.renderItem(item ?? null, ref);
            updateSync(element, fiberRoot);
        });

        this.factory.connect("unbind", (_self, listItemObj) => {
            const id = getObjectId(listItemObj);
            const fiberRoot = this.fiberRoots.get(id);
            if (!fiberRoot) return;

            const ref = () => {};
            const element = this.renderItem(null, ref);
            updateSync(element, fiberRoot);
        });

        this.factory.connect("teardown", (_self, listItemObj) => {
            const id = getObjectId(listItemObj);
            const fiberRoot = this.fiberRoots.get(id);
            if (!fiberRoot) return;

            updateSync(null, fiberRoot);
            this.fiberRoots.delete(id);
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
        consumed.add("renderItem");
        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        if (oldProps.renderItem !== newProps.renderItem) {
            this.renderItem = newProps.renderItem as RenderItemFn<unknown>;
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
