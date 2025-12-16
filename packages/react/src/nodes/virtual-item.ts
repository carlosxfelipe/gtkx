import { isItemContainer } from "../container-interfaces.js";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

/**
 * Type guard for nodes that have a getItem method.
 */
const hasGetItem = (node: Node): node is Node & { getItem(): unknown } => {
    return typeof (node as { getItem?: unknown }).getItem === "function";
};

/**
 * Base class for virtual item nodes used in list-based containers.
 * Virtual nodes don't create GTK widgets directly but represent items
 * in list models (ListView, GridView, DropDown, ColumnView).
 */
export abstract class VirtualItemNode extends Node<never> {
    protected override isVirtual(): boolean {
        return true;
    }

    private item: unknown;

    override initialize(props: Props): void {
        this.item = props.item;
        super.initialize(props);
    }

    getItem(): unknown {
        return this.item;
    }

    override attachToParent(parent: Node): void {
        if (isItemContainer(parent)) {
            parent.addItem(this.item);
        }
    }

    override attachToParentBefore(parent: Node, before: Node): void {
        if (isItemContainer(parent) && hasGetItem(before)) {
            parent.insertItemBefore(this.item, before.getItem());
        } else {
            this.attachToParent(parent);
        }
    }

    override detachFromParent(parent: Node): void {
        if (isItemContainer(parent)) {
            parent.removeItem(this.item);
        }
    }

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();
        consumed.add("item");
        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        if (oldProps.item !== newProps.item && this.parent && isItemContainer(this.parent)) {
            this.parent.updateItem(this.item, newProps.item);
            this.item = newProps.item;
        }

        super.updateProps(oldProps, newProps);
    }
}
