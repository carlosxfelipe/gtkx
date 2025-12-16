import { getInterface } from "@gtkx/ffi";
import * as Gio from "@gtkx/ffi/gio";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { ItemContainer } from "../container-interfaces.js";
import type { Props } from "../factory.js";
import { Node } from "../node.js";
import { type ItemLabelFn, StringListStore } from "./string-list-store.js";

type StringListContainerState = {
    store: StringListStore;
    onSelectionChanged?: (item: unknown, index: number) => void;
};

type StringListWidget = Gtk.Widget & {
    setModel(model: Gio.ListModel): void;
    getSelected(): number;
};

const SELECTION_SIGNAL = "notify::selected";

/**
 * Base class for widgets that use StringListStore for item management (DropDown, ComboRow).
 * Handles proper signal lifecycle management to prevent memory leaks.
 */
export abstract class StringListContainerNode<T extends StringListWidget>
    extends Node<T, StringListContainerState>
    implements ItemContainer<unknown>
{
    override initialize(props: Props): void {
        const labelFn = (props.itemLabel as ItemLabelFn) ?? ((item: unknown) => String(item));
        const store = new StringListStore(labelFn);
        const onSelectionChanged = props.onSelectionChanged as ((item: unknown, index: number) => void) | undefined;

        this.state = { store, onSelectionChanged };

        super.initialize(props);

        this.widget.setModel(getInterface(store.getModel(), Gio.ListModel)!);

        if (onSelectionChanged) {
            this.connectSelectionHandler();
        }
    }

    private connectSelectionHandler(): void {
        const handler = () => {
            const index = this.widget.getSelected();
            const item = this.state.store.getItem(index);
            this.state.onSelectionChanged?.(item, index);
        };

        this.connectSignal(this.widget, SELECTION_SIGNAL, handler);
    }

    addItem(item: unknown): void {
        this.state.store.append(item);
    }

    insertItemBefore(item: unknown, beforeItem: unknown): void {
        this.state.store.insertBefore(item, beforeItem);
    }

    removeItem(item: unknown): void {
        this.state.store.remove(item);
    }

    updateItem(oldItem: unknown, newItem: unknown): void {
        this.state.store.update(oldItem, newItem);
    }

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();
        consumed.add("itemLabel");
        consumed.add("onSelectionChanged");
        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        const oldCallback = oldProps.onSelectionChanged as ((item: unknown, index: number) => void) | undefined;
        const newCallback = newProps.onSelectionChanged as ((item: unknown, index: number) => void) | undefined;

        if (oldCallback !== newCallback) {
            // Update state first
            this.state.onSelectionChanged = newCallback;

            // Handle signal connection/disconnection based on callback presence change
            const hadCallback = oldCallback !== undefined;
            const hasCallback = newCallback !== undefined;

            if (hadCallback && !hasCallback) {
                // Callback was removed - disconnect the signal
                this.disconnectSignal(SELECTION_SIGNAL);
            } else if (!hadCallback && hasCallback) {
                // Callback was added - connect the signal
                this.connectSelectionHandler();
            }
            // If both had and have callback, no signal management needed
            // The handler uses this.state.onSelectionChanged which is already updated
        }

        super.updateProps(oldProps, newProps);
    }
}
