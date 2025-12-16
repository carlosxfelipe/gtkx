import type * as Gtk from "@gtkx/ffi/gtk";
import type { ChildContainer, StackPageContainer, StackPageProps } from "../container-interfaces.js";
import type { Props } from "../factory.js";
import { Node } from "../node.js";
import { applyStackPageProps, type StackPageLike } from "./stack-page-props.js";

type StackWidget = Gtk.Widget & {
    getChildByName(name: string): Gtk.Widget | null;
    setVisibleChild(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
    getPage(child: Gtk.Widget): StackPageLike;
};

/**
 * Abstract node for paged stack widgets (Gtk.Stack, Adw.ViewStack).
 * Handles visible child deferral and common page operations.
 */
export abstract class PagedStackNode<T extends StackWidget>
    extends Node<T>
    implements StackPageContainer, ChildContainer
{
    static override consumedPropNames = ["visibleChildName"];

    private pendingVisibleChildName: string | null = null;

    /**
     * Add a page to the stack widget. Must be implemented by subclasses
     * due to API differences between Gtk.Stack and Adw.ViewStack.
     */
    abstract addStackPage(child: Gtk.Widget, props: StackPageProps): void;

    /**
     * Add a child directly to the stack widget (without page props).
     * Must be implemented by subclasses due to API differences.
     */
    protected abstract addChildToWidget(child: Gtk.Widget): void;

    protected applyPendingVisibleChild(): void {
        if (this.pendingVisibleChildName !== null) {
            const child = this.widget.getChildByName(this.pendingVisibleChildName);
            if (child) {
                this.widget.setVisibleChild(child);
                this.pendingVisibleChildName = null;
            }
        }
    }

    insertStackPageBefore(child: Gtk.Widget, props: StackPageProps, _beforeChild: Gtk.Widget): void {
        this.addStackPage(child, props);
    }

    removeStackPage(child: Gtk.Widget): void {
        this.widget.remove(child);
    }

    updateStackPageProps(child: Gtk.Widget, props: StackPageProps): void {
        const page = this.widget.getPage(child);
        applyStackPageProps(page, props);
    }

    attachChild(child: Gtk.Widget): void {
        this.addChildToWidget(child);
    }

    insertChildBefore(child: Gtk.Widget, _before: Gtk.Widget): void {
        this.addChildToWidget(child);
    }

    detachChild(child: Gtk.Widget): void {
        this.widget.remove(child);
    }

    private setVisibleChildOrDefer(name: string): void {
        const child = this.widget.getChildByName(name);

        if (child) {
            this.widget.setVisibleChild(child);
            this.pendingVisibleChildName = null;
        } else {
            this.pendingVisibleChildName = name;
        }
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        if (newProps.visibleChildName !== undefined) {
            this.setVisibleChildOrDefer(newProps.visibleChildName as string);
        }

        super.updateProps(oldProps, newProps);
    }
}
