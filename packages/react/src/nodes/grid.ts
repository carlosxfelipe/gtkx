import type * as Gtk from "@gtkx/ffi/gtk";
import { type GridContainer, isGridContainer } from "../container-interfaces.js";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

export class GridNode extends Node<Gtk.Grid> implements GridContainer {
    static matches(type: string): boolean {
        return type === "Grid.Root";
    }

    attachToGrid(child: Gtk.Widget, column: number, row: number, colSpan: number, rowSpan: number): void {
        this.widget.attach(child, column, row, colSpan, rowSpan);
    }

    removeFromGrid(child: Gtk.Widget): void {
        this.widget.remove(child);
    }
}

export class GridChildNode extends Node<never> {
    static matches(type: string): boolean {
        return type === "Grid.Child";
    }

    protected override isVirtual(): boolean {
        return true;
    }

    private column: number = 0;
    private row: number = 0;
    private columnSpan: number = 1;
    private rowSpan: number = 1;
    private childWidget: Gtk.Widget | null = null;
    private parentContainer: (Node & GridContainer) | null = null;

    override initialize(props: Props): void {
        this.column = (props.column as number | undefined) ?? 0;
        this.row = (props.row as number | undefined) ?? 0;
        this.columnSpan = (props.columnSpan as number | undefined) ?? 1;
        this.rowSpan = (props.rowSpan as number | undefined) ?? 1;
        super.initialize(props);
    }

    override appendChild(child: Node): void {
        const widget = child.getWidget();

        if (widget) {
            this.childWidget = widget;

            if (this.parentContainer) {
                this.attachChildToGrid();
            }
        }
    }

    override removeChild(child: Node): void {
        const widget = child.getWidget();

        if (widget && this.childWidget === widget) {
            this.detachChildFromGrid();
            this.childWidget = null;
        }
    }

    private attachChildToGrid(): void {
        if (!this.parentContainer || !this.childWidget) return;
        this.parentContainer.attachToGrid(this.childWidget, this.column, this.row, this.columnSpan, this.rowSpan);
    }

    private detachChildFromGrid(): void {
        if (!this.parentContainer || !this.childWidget) return;
        this.parentContainer.removeFromGrid(this.childWidget);
    }

    override attachToParent(parent: Node): void {
        if (isGridContainer(parent)) {
            this.parentContainer = parent;

            if (this.childWidget) {
                this.attachChildToGrid();
            }
        }
    }

    override detachFromParent(parent: Node): void {
        if (isGridContainer(parent)) {
            this.detachChildFromGrid();
            this.parentContainer = null;
        }
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        const positionChanged =
            oldProps.column !== newProps.column ||
            oldProps.row !== newProps.row ||
            oldProps.columnSpan !== newProps.columnSpan ||
            oldProps.rowSpan !== newProps.rowSpan;

        if (positionChanged) {
            this.detachChildFromGrid();
            this.column = (newProps.column as number | undefined) ?? 0;
            this.row = (newProps.row as number | undefined) ?? 0;
            this.columnSpan = (newProps.columnSpan as number | undefined) ?? 1;
            this.rowSpan = (newProps.rowSpan as number | undefined) ?? 1;
            this.attachChildToGrid();
        }
    }
}
