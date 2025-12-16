import type * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

export abstract class VirtualSlotNode<TContainer, TProps> extends Node<never> {
    protected override isVirtual(): boolean {
        return true;
    }

    protected childWidget: Gtk.Widget | null = null;
    protected parentContainer: (Node & TContainer) | null = null;
    protected slotProps!: TProps;

    protected abstract isValidContainer(parent: Node): parent is Node & TContainer;
    protected abstract addToContainer(container: TContainer, child: Gtk.Widget, props: TProps): void;
    protected abstract insertBeforeInContainer(
        container: TContainer,
        child: Gtk.Widget,
        props: TProps,
        before: Gtk.Widget,
    ): void;
    protected abstract removeFromContainer(container: TContainer, child: Gtk.Widget): void;
    protected abstract updateInContainer(container: TContainer, child: Gtk.Widget, props: TProps): void;
    protected abstract extractSlotProps(props: Props): TProps;

    override initialize(props: Props): void {
        this.slotProps = this.extractSlotProps(props);
        super.initialize(props);
    }

    getChildWidget(): Gtk.Widget | null {
        return this.childWidget;
    }

    override appendChild(child: Node): void {
        const childWidget = child.getWidget();
        if (childWidget) {
            this.childWidget = childWidget;
        }
    }

    override attachToParent(parent: Node): void {
        if (this.isValidContainer(parent) && this.childWidget) {
            this.parentContainer = parent;
            this.addToContainer(parent, this.childWidget, this.slotProps);
        }
    }

    override attachToParentBefore(parent: Node, before: Node): void {
        if (this.isValidContainer(parent) && this.childWidget) {
            this.parentContainer = parent;
            const beforeWidget = this.getBeforeWidget(before);

            if (beforeWidget) {
                this.insertBeforeInContainer(parent, this.childWidget, this.slotProps, beforeWidget);
            } else {
                this.addToContainer(parent, this.childWidget, this.slotProps);
            }
        }
    }

    protected getBeforeWidget(before: Node): Gtk.Widget | null {
        if (before instanceof VirtualSlotNode) {
            return before.getChildWidget();
        }
        return before.getWidget() ?? null;
    }

    override detachFromParent(parent: Node): void {
        if (this.isValidContainer(parent) && this.childWidget) {
            this.removeFromContainer(parent, this.childWidget);
            this.parentContainer = null;
        }
    }

    protected updateSlotPropsIfChanged(oldProps: Props, newProps: Props, propKeys: string[]): boolean {
        const changed = propKeys.some((key) => oldProps[key] !== newProps[key]);

        if (changed) {
            this.slotProps = this.extractSlotProps(newProps);

            if (this.parentContainer && this.childWidget) {
                this.updateInContainer(this.parentContainer, this.childWidget, this.slotProps);
            }
        }

        return changed;
    }
}
