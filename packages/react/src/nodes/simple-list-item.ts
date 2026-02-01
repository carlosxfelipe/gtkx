import type { StringListItemProps } from "../jsx.js";
import type { Node } from "../node.js";
import type { SimpleListStore } from "./internal/simple-list-store.js";
import { ListItemNode } from "./list-item.js";

export class SimpleListItemNode extends ListItemNode<SimpleListStore, StringListItemProps> {
    public override isValidChild(_child: Node): boolean {
        return false;
    }
}
