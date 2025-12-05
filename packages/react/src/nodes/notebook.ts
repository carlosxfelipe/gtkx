import * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

export class NotebookNode extends Node<Gtk.Notebook> {
    static matches(type: string): boolean {
        return type === "Notebook.Root";
    }

    addPage(child: Gtk.Widget, label: string): void {
        const tabLabel = new Gtk.Label();
        tabLabel.setLabel(label);
        this.widget.appendPage(child, tabLabel);
    }

    insertPageBefore(child: Gtk.Widget, label: string, beforeChild: Gtk.Widget): void {
        const beforePageNum = this.widget.pageNum(beforeChild);
        const tabLabel = new Gtk.Label();
        tabLabel.setLabel(label);

        if (beforePageNum >= 0) {
            this.widget.insertPage(child, beforePageNum, tabLabel);
        } else {
            this.widget.appendPage(child, tabLabel);
        }
    }

    removePage(child: Gtk.Widget): void {
        const pageNum = this.widget.pageNum(child);

        if (pageNum >= 0) {
            this.widget.removePage(pageNum);
        }
    }

    updatePageLabel(child: Gtk.Widget, label: string): void {
        const tabLabel = new Gtk.Label();
        tabLabel.setLabel(label);
        this.widget.setTabLabel(child, tabLabel);
    }
}

export class NotebookPageNode extends Node {
    static matches(type: string): boolean {
        return type === "Notebook.Page";
    }

    protected override isVirtual(): boolean {
        return true;
    }

    private label: string;
    private childWidget: Gtk.Widget | null = null;
    private parentNotebook: NotebookNode | null = null;

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);
        this.label = (props.label as string) ?? "";
    }

    getLabel(): string {
        return this.label;
    }

    setChildWidget(widget: Gtk.Widget): void {
        this.childWidget = widget;
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
        if (parent instanceof NotebookNode && this.childWidget) {
            this.parentNotebook = parent;
            parent.addPage(this.childWidget, this.label);
        }
    }

    override attachToParentBefore(parent: Node, before: Node): void {
        if (parent instanceof NotebookNode && this.childWidget) {
            this.parentNotebook = parent;
            const beforePage = before instanceof NotebookPageNode ? before.getChildWidget() : before.getWidget();

            if (beforePage) {
                parent.insertPageBefore(this.childWidget, this.label, beforePage);
            } else {
                parent.addPage(this.childWidget, this.label);
            }
        }
    }

    override detachFromParent(parent: Node): void {
        if (parent instanceof NotebookNode && this.childWidget) {
            parent.removePage(this.childWidget);
            this.parentNotebook = null;
        }
    }

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();
        consumed.add("label");
        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        if (oldProps.label !== newProps.label) {
            this.label = (newProps.label as string) ?? "";

            if (this.parentNotebook && this.childWidget) {
                this.parentNotebook.updatePageLabel(this.childWidget, this.label);
            }
        }

        super.updateProps(oldProps, newProps);
    }
}
