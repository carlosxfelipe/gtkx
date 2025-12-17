import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { isPackContainer, type PackContainer } from "../container-interfaces.js";
import type { Props } from "../factory.js";
import { Node } from "../node.js";
import { VirtualSlotNode } from "./virtual-slot.js";

type HeaderBarWidget = Gtk.HeaderBar | Adw.HeaderBar | Gtk.ActionBar;

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
        } else {
            child.detachFromParent(this);
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

type PackSlotProps = {
    position: PackPosition;
};

abstract class PackSlotNode extends VirtualSlotNode<PackContainer, PackSlotProps> {
    protected abstract readonly position: PackPosition;

    protected isValidContainer(parent: Node): parent is Node & PackContainer {
        return isPackContainer(parent);
    }

    protected extractSlotProps(_props: Props): PackSlotProps {
        return { position: this.position };
    }

    protected addToContainer(container: PackContainer, child: Gtk.Widget, props: PackSlotProps): void {
        if (props.position === "start") {
            container.packStart(child);
        } else {
            container.packEnd(child);
        }
    }

    protected insertBeforeInContainer(
        container: PackContainer,
        child: Gtk.Widget,
        props: PackSlotProps,
        _before: Gtk.Widget,
    ): void {
        this.addToContainer(container, child, props);
    }

    protected removeFromContainer(container: PackContainer, child: Gtk.Widget): void {
        container.removeFromPack(child);
    }

    protected updateInContainer(): void {}
}

export class PackStartNode extends PackSlotNode {
    protected override readonly position: PackPosition = "start";

    static matches(type: string): boolean {
        return type === "HeaderBar.Start" || type === "AdwHeaderBar.Start" || type === "ActionBar.Start";
    }
}

export class PackEndNode extends PackSlotNode {
    protected override readonly position: PackPosition = "end";

    static matches(type: string): boolean {
        return type === "HeaderBar.End" || type === "AdwHeaderBar.End" || type === "ActionBar.End";
    }
}
