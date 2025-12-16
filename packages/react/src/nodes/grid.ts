import type * as Gtk from "@gtkx/ffi/gtk";
import { type GridContainer, isGridContainer } from "../container-interfaces.js";
import type { Props } from "../factory.js";
import { Node } from "../node.js";
import { VirtualSlotNode } from "./virtual-slot.js";

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

type GridChildProps = {
    column: number;
    row: number;
    columnSpan: number;
    rowSpan: number;
};

export class GridChildNode extends VirtualSlotNode<GridContainer, GridChildProps> {
    static matches(type: string): boolean {
        return type === "Grid.Child";
    }

    protected isValidContainer(parent: Node): parent is Node & GridContainer {
        return isGridContainer(parent);
    }

    protected extractSlotProps(props: Props): GridChildProps {
        return {
            column: (props.column as number | undefined) ?? 0,
            row: (props.row as number | undefined) ?? 0,
            columnSpan: (props.columnSpan as number | undefined) ?? 1,
            rowSpan: (props.rowSpan as number | undefined) ?? 1,
        };
    }

    protected addToContainer(container: GridContainer, child: Gtk.Widget, props: GridChildProps): void {
        container.attachToGrid(child, props.column, props.row, props.columnSpan, props.rowSpan);
    }

    protected insertBeforeInContainer(
        container: GridContainer,
        child: Gtk.Widget,
        props: GridChildProps,
        _before: Gtk.Widget,
    ): void {
        this.addToContainer(container, child, props);
    }

    protected removeFromContainer(container: GridContainer, child: Gtk.Widget): void {
        container.removeFromGrid(child);
    }

    protected updateInContainer(container: GridContainer, child: Gtk.Widget, props: GridChildProps): void {
        container.removeFromGrid(child);
        container.attachToGrid(child, props.column, props.row, props.columnSpan, props.rowSpan);
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        this.updateSlotPropsIfChanged(oldProps, newProps, ["column", "row", "columnSpan", "rowSpan"]);
    }
}
