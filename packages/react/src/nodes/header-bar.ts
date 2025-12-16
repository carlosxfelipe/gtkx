import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { isPackContainer, type PackContainer } from "../container-interfaces.js";
import { Node } from "../node.js";

type HeaderBarWidget = Gtk.HeaderBar | Adw.HeaderBar | Gtk.ActionBar;

/**
 * Container node for widgets with pack start/end functionality (HeaderBar, ActionBar).
 * Exported for reuse by ActionBarNode.
 */
export class PackContainerNode<T extends HeaderBarWidget> extends Node<T> implements PackContainer {
    packStart(child: Gtk.Widget): void {
        this.widget.packStart(child);
    }

    packEnd(child: Gtk.Widget): void {
        this.widget.packEnd(child);
    }

    removeFromPack(child: Gtk.Widget): void {
        this.widget.remove(child);
    }

    appendChild(child: Node): void {
        const childWidget = child.getWidget();

        if (!childWidget) {
            child.attachToParent(this);
            return;
        }

        this.packStart(childWidget);
    }

    removeChild(child: Node): void {
        const childWidget = child.getWidget();

        if (childWidget) {
            this.removeFromPack(childWidget);
        }
    }
}

export class AdwHeaderBarNode extends PackContainerNode<Adw.HeaderBar> {
    static matches(type: string): boolean {
        return type === "AdwHeaderBar" || type === "AdwHeaderBar.Root";
    }
}

export class HeaderBarNode extends PackContainerNode<Gtk.HeaderBar> {
    static matches(type: string): boolean {
        return type === "HeaderBar" || type === "HeaderBar.Root";
    }
}

type PackPosition = "start" | "end";

class PackSlotNode extends Node<never> {
    protected position: PackPosition = "start";

    protected override isVirtual(): boolean {
        return true;
    }

    private childWidget: Gtk.Widget | null = null;
    private parentContainer: (Node & PackContainer) | null = null;

    override appendChild(child: Node): void {
        const widget = child.getWidget();

        if (widget) {
            this.childWidget = widget;

            if (this.parentContainer) {
                if (this.position === "start") {
                    this.parentContainer.packStart(widget);
                } else {
                    this.parentContainer.packEnd(widget);
                }
            }
        }
    }

    override removeChild(child: Node): void {
        const widget = child.getWidget();

        if (widget && this.childWidget === widget) {
            if (this.parentContainer) {
                this.parentContainer.removeFromPack(widget);
            }

            this.childWidget = null;
        }
    }

    override attachToParent(parent: Node): void {
        if (isPackContainer(parent)) {
            this.parentContainer = parent;

            if (this.childWidget) {
                if (this.position === "start") {
                    this.parentContainer.packStart(this.childWidget);
                } else {
                    this.parentContainer.packEnd(this.childWidget);
                }
            }
        }
    }

    override detachFromParent(parent: Node): void {
        if (isPackContainer(parent) && this.childWidget) {
            parent.removeFromPack(this.childWidget);
            this.parentContainer = null;
        }
    }
}

export class PackStartNode extends PackSlotNode {
    protected override position: PackPosition = "start";

    static matches(type: string): boolean {
        return type === "HeaderBar.Start" || type === "AdwHeaderBar.Start" || type === "ActionBar.Start";
    }
}

export class PackEndNode extends PackSlotNode {
    protected override position: PackPosition = "end";

    static matches(type: string): boolean {
        return type === "HeaderBar.End" || type === "AdwHeaderBar.End" || type === "ActionBar.End";
    }
}
