import * as Gtk from "@gtkx/ffi/gtk";

export type ItemLabelFn = (item: unknown) => string;

export class StringListStore {
    private stringList: Gtk.StringList;
    private items: unknown[] = [];
    private labelFn: ItemLabelFn;

    constructor(labelFn: ItemLabelFn) {
        this.stringList = new Gtk.StringList([]);
        this.labelFn = labelFn;
    }

    getModel(): Gtk.StringList {
        return this.stringList;
    }

    append(item: unknown): void {
        const label = this.labelFn(item);
        this.stringList.append(label);
        this.items.push(item);
    }

    insertBefore(item: unknown, beforeItem: unknown): void {
        const beforeIndex = this.items.indexOf(beforeItem);

        if (beforeIndex === -1) {
            this.append(item);
            return;
        }

        const label = this.labelFn(item);
        this.stringList.splice(beforeIndex, 0, [label]);
        this.items.splice(beforeIndex, 0, item);
    }

    remove(item: unknown): void {
        const index = this.items.indexOf(item);

        if (index !== -1) {
            this.stringList.remove(index);
            this.items.splice(index, 1);
        }
    }

    update(oldItem: unknown, newItem: unknown): void {
        const index = this.items.indexOf(oldItem);

        if (index !== -1) {
            const label = this.labelFn(newItem);
            this.stringList.splice(index, 1, [label]);
            this.items[index] = newItem;
        }
    }

    getItem(index: number): unknown {
        return this.items[index];
    }
}
