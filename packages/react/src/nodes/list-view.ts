import * as Gtk from "@gtkx/ffi/gtk";
import type { GtkListViewProps } from "../jsx.js";
import type { Container } from "../types.js";
import { ListItemRenderer } from "./internal/list-item-renderer.js";
import { filterProps, hasChanged } from "./internal/props.js";
import type { ListItemNode } from "./list-item.js";
import { ListModel, type ListModelProps } from "./models/list.js";
import { WidgetNode } from "./widget.js";

const RENDERER_PROP_NAMES = ["renderItem", "estimatedItemHeight"] as const;
const PROP_NAMES = [...RENDERER_PROP_NAMES, "autoexpand", "selectionMode", "selected", "onSelectionChanged"] as const;

type ListViewProps = Pick<GtkListViewProps, (typeof RENDERER_PROP_NAMES)[number]> & ListModelProps;

export class ListViewNode extends WidgetNode<Gtk.ListView, ListViewProps, ListItemNode> {
    private itemRenderer: ListItemRenderer;
    private list: ListModel;

    public static override createContainer(): Gtk.ListView {
        return new Gtk.ListView();
    }

    constructor(typeName: string, props: ListViewProps, container: Gtk.ListView | undefined, rootContainer: Container) {
        const listView = container ?? new Gtk.ListView();
        super(typeName, props, listView, rootContainer);
        this.list = new ListModel(
            { owner: this, signalStore: this.signalStore },
            {
                autoexpand: props.autoexpand,
                selectionMode: props.selectionMode,
                selected: props.selected,
                onSelectionChanged: props.onSelectionChanged,
            },
        );
        this.itemRenderer = new ListItemRenderer(this.signalStore);
        this.itemRenderer.setStore(this.list.getStore());
        this.list.getStore().setOnItemUpdated((id) => this.itemRenderer.rebindItem(id));
        this.container.setFactory(this.itemRenderer.getFactory());
    }

    public override finalizeInitialChildren(props: ListViewProps): boolean {
        super.finalizeInitialChildren(props);
        return true;
    }

    public override commitMount(): void {
        super.commitMount();
        this.container.setModel(this.list.getSelectionModel());
    }

    public override detachDeletedInstance(): void {
        this.itemRenderer.dispose();
        super.detachDeletedInstance();
    }

    public override appendChild(child: ListItemNode): void {
        super.appendChild(child);
        this.list.appendChild(child);
    }

    public override insertBefore(child: ListItemNode, before: ListItemNode): void {
        super.insertBefore(child, before);
        this.list.insertBefore(child, before);
    }

    public override removeChild(child: ListItemNode): void {
        this.list.removeChild(child);
        super.removeChild(child);
    }

    public override commitUpdate(oldProps: ListViewProps | null, newProps: ListViewProps): void {
        if (hasChanged(oldProps, newProps, "renderItem")) {
            this.itemRenderer.setRenderFn(newProps.renderItem ?? null);
        }

        if (hasChanged(oldProps, newProps, "estimatedItemHeight")) {
            this.itemRenderer.setEstimatedItemHeight(newProps.estimatedItemHeight ?? null);
        }

        const previousModel = this.list.getSelectionModel();
        this.list.updateProps(
            oldProps ? filterProps(oldProps, RENDERER_PROP_NAMES) : null,
            filterProps(newProps, RENDERER_PROP_NAMES),
        );
        const currentModel = this.list.getSelectionModel();

        if (previousModel !== currentModel) {
            this.container.setModel(currentModel);
        }

        super.commitUpdate(oldProps ? filterProps(oldProps, PROP_NAMES) : null, filterProps(newProps, PROP_NAMES));
    }
}
