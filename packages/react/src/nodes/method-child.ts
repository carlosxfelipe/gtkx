import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { isRemovable } from "./internal/predicates.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type AttachFn = (parent: Gtk.Widget, child: Gtk.Widget) => void;

const ATTACH_METHODS: Record<string, AttachFn> = {
    ActionRowPrefix: (p, c) => (p as Adw.ActionRow).addPrefix(c),
    ActionRowSuffix: (p, c) => (p as Adw.ActionRow).addSuffix(c),
    ExpanderRowRow: (p, c) => (p as Adw.ExpanderRow).addRow(c),
    ExpanderRowAction: (p, c) => (p as Adw.ExpanderRow).addAction(c),
    PackStart: (p, c) => (p as Gtk.ActionBar).packStart(c),
    PackEnd: (p, c) => (p as Gtk.ActionBar).packEnd(c),
    ToolbarTop: (p, c) => (p as Adw.ToolbarView).addTopBar(c),
    ToolbarBottom: (p, c) => (p as Adw.ToolbarView).addBottomBar(c),
};

export class MethodChildNode extends VirtualNode<unknown, WidgetNode, WidgetNode> {
    private attach: AttachFn;

    constructor(...args: ConstructorParameters<typeof VirtualNode<unknown, WidgetNode, WidgetNode>>) {
        super(...args);
        const fn = ATTACH_METHODS[this.typeName];
        if (!fn) {
            throw new Error(`Unknown MethodChildNode type: ${this.typeName}`);
        }
        this.attach = fn;
    }

    public override isValidChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override setParent(parent: WidgetNode | null): void {
        const previousParent = this.parent;
        super.setParent(parent);

        if (parent) {
            for (const child of this.children) {
                this.attach(parent.container, child.container);
            }
        } else if (previousParent) {
            this.detachAllChildren(previousParent.container);
        }
    }

    public override appendChild(child: WidgetNode): void {
        super.appendChild(child);

        if (this.parent) {
            this.attach(this.parent.container, child.container);
        }
    }

    public override insertBefore(child: WidgetNode, before: WidgetNode): void {
        super.insertBefore(child, before);

        if (this.parent) {
            this.attach(this.parent.container, child.container);
        }
    }

    public override removeChild(child: WidgetNode): void {
        if (this.parent && isRemovable(this.parent.container)) {
            const widget = child.container;
            const currentParent = widget.getParent();
            if (currentParent && currentParent === this.parent.container) {
                this.parent.container.remove(widget);
            }
        }

        super.removeChild(child);
    }

    public override detachDeletedInstance(): void {
        if (this.parent) {
            this.detachAllChildren(this.parent.container);
        }
        super.detachDeletedInstance();
    }

    private detachAllChildren(parent: Gtk.Widget): void {
        if (!isRemovable(parent)) return;

        for (const child of this.children) {
            const currentParent = child.container.getParent();
            if (currentParent && currentParent === parent) {
                parent.remove(child.container);
            }
        }
    }
}
