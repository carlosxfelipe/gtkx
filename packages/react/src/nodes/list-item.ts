import type { ListItemProps } from "../jsx.js";
import type { Node } from "../node.js";
import { hasChanged } from "./internal/props.js";
import { type TreeItemData, TreeStore } from "./internal/tree-store.js";
import { VirtualNode } from "./virtual.js";

export const createItemData = (props: ListItemProps): TreeItemData => ({
    value: props.value,
    indentForDepth: props.indentForDepth,
    indentForIcon: props.indentForIcon,
    hideExpander: props.hideExpander,
});

export type ItemStore = { updateItem(id: string, value: unknown): void };

export class ListItemNode<
    TStore extends ItemStore = TreeStore,
    TProps extends ListItemProps = ListItemProps,
> extends VirtualNode<TProps, Node, ListItemNode> {
    private store: TStore | null = null;
    private parentItemId: string | null = null;

    public setStore(store: ItemStore | null): void {
        this.store = store as TStore | null;
        if (store === null || store instanceof TreeStore) {
            for (const child of this.children) {
                child.setStore(store);
            }
        }
    }

    public getChildNodes(): readonly ListItemNode[] {
        return this.children;
    }

    public setParentItemId(parentId: string | null): void {
        this.parentItemId = parentId;
    }

    public getParentItemId(): string | null {
        return this.parentItemId;
    }

    public override isValidChild(child: Node): boolean {
        return child instanceof ListItemNode;
    }

    public override appendChild(child: ListItemNode): void {
        super.appendChild(child);
        child.setParentItemId(this.props.id);

        if (this.store instanceof TreeStore) {
            child.setStore(this.store as never);
            this.store.addItem(child.props.id, createItemData(child.props as ListItemProps), this.props.id);
        }
    }

    public override insertBefore(child: ListItemNode, before: ListItemNode): void {
        super.insertBefore(child, before);
        child.setParentItemId(this.props.id);

        if (this.store instanceof TreeStore) {
            child.setStore(this.store as never);
            this.store.insertItemBefore(
                child.props.id,
                before.props.id,
                createItemData(child.props as ListItemProps),
                this.props.id,
            );
        }
    }

    public override removeChild(child: ListItemNode): void {
        if (this.store instanceof TreeStore) {
            this.store.removeItem(child.props.id, this.props.id);
        }

        child.setStore(null);
        child.setParentItemId(null);
        super.removeChild(child);
    }

    public override commitUpdate(oldProps: TProps | null, newProps: TProps): void {
        super.commitUpdate(oldProps, newProps);

        if (!this.store) return;

        if (this.store instanceof TreeStore) {
            const propsChanged =
                !oldProps ||
                oldProps.id !== newProps.id ||
                oldProps.value !== newProps.value ||
                (oldProps as ListItemProps).indentForDepth !== (newProps as ListItemProps).indentForDepth ||
                (oldProps as ListItemProps).indentForIcon !== (newProps as ListItemProps).indentForIcon ||
                (oldProps as ListItemProps).hideExpander !== (newProps as ListItemProps).hideExpander;

            if (propsChanged) {
                this.store.updateItem(newProps.id, createItemData(newProps as ListItemProps));
            }
        } else {
            if (hasChanged(oldProps, newProps, "id") || hasChanged(oldProps, newProps, "value")) {
                this.store.updateItem(newProps.id, newProps.value);
            }
        }
    }
}
