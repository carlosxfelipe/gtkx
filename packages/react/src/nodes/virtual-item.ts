import { isItemContainer } from "../container-interfaces.js";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

const hasGetId = (node: Node): node is Node & { getId(): string } => {
    return typeof (node as { getId?: unknown }).getId === "function";
};

/**
 * Base class for virtual item nodes used in list-based containers.
 * Virtual nodes don't create GTK widgets directly but represent items
 * in list models (ListView, GridView, ColumnView).
 */
export abstract class VirtualItemNode extends Node<never> {
    static override consumedPropNames = ["id", "item"];

    protected override isVirtual(): boolean {
        return true;
    }

    private id = "";
    private item: unknown;

    override initialize(props: Props): void {
        this.id = props.id as string;
        this.item = props.item;
        super.initialize(props);
    }

    getId(): string {
        return this.id;
    }

    getItem(): unknown {
        return this.item;
    }

    override attachToParent(parent: Node): void {
        if (isItemContainer(parent)) {
            parent.addItem(this.id, this.item);
        }
    }

    override attachToParentBefore(parent: Node, before: Node): void {
        if (isItemContainer(parent) && hasGetId(before)) {
            parent.insertItemBefore(this.id, this.item, before.getId());
        } else {
            this.attachToParent(parent);
        }
    }

    override detachFromParent(parent: Node): void {
        if (isItemContainer(parent)) {
            parent.removeItem(this.id);
        }
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        const newId = newProps.id as string;
        const newItem = newProps.item;

        if ((oldProps.id !== newId || oldProps.item !== newItem) && this.parent && isItemContainer(this.parent)) {
            this.parent.updateItem(newId, newItem);
            this.id = newId;
            this.item = newItem;
        }

        super.updateProps(oldProps, newProps);
    }
}
