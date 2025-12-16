import type * as Adw from "@gtkx/ffi/adw";
import { StringListContainerNode } from "./string-list-container.js";

export class ComboRowNode extends StringListContainerNode<Adw.ComboRow> {
    static matches(type: string): boolean {
        return type === "AdwComboRow.Root";
    }
}
