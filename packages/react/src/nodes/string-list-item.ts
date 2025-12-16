import type { Props } from "../factory.js";
import { Node } from "../node.js";
import { isStringListContainer, type StringListItem } from "./string-list-container.js";

export abstract class StringListItemNode extends Node<never> {
    static override consumedPropNames = ["id", "label"];

    protected override isVirtual(): boolean {
        return true;
    }

    private id!: string;
    private label!: string;

    override initialize(props: Props): void {
        this.id = props.id as string;
        this.label = props.label as string;
        super.initialize(props);
    }

    getStringListItem(): StringListItem {
        return { id: this.id, label: this.label };
    }

    override attachToParent(parent: Node): void {
        if (isStringListContainer(parent)) {
            parent.addStringListItem(this.id, this.label);
        }
    }

    override attachToParentBefore(parent: Node, before: Node): void {
        if (isStringListContainer(parent) && before instanceof StringListItemNode) {
            parent.insertStringListItemBefore(this.id, this.label, before.id);
        } else {
            this.attachToParent(parent);
        }
    }

    override detachFromParent(parent: Node): void {
        if (isStringListContainer(parent)) {
            parent.removeStringListItem(this.id);
        }
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        const oldId = oldProps.id as string;
        const newId = newProps.id as string;
        const oldLabel = oldProps.label as string;
        const newLabel = newProps.label as string;

        if ((oldId !== newId || oldLabel !== newLabel) && this.parent && isStringListContainer(this.parent)) {
            this.parent.updateStringListItem(this.id, newId, newLabel);
            this.id = newId;
            this.label = newLabel;
        }

        super.updateProps(oldProps, newProps);
    }
}
