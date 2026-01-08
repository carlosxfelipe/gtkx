import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { STACK_CLASSES } from "../generated/internal.js";
import { registerNodeClass } from "../registry.js";
import { scheduleAfterCommit } from "../scheduler.js";
import type { Container, ContainerClass } from "../types.js";
import { filterProps, matchesAnyClass } from "./internal/utils.js";
import { WidgetNode } from "./widget.js";

const PROPS = ["page"];

type StackProps = {
    page?: string;
};

class StackNode extends WidgetNode<Gtk.Stack | Adw.ViewStack, StackProps> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesAnyClass(STACK_CLASSES, containerOrClass);
    }

    public override updateProps(oldProps: StackProps | null, newProps: StackProps): void {
        if (newProps.page && this.container.getVisibleChildName() !== newProps.page) {
            const page = newProps.page;

            scheduleAfterCommit(() => {
                if (this.container.getChildByName(page)) {
                    this.container.setVisibleChildName(page);
                }
            });
        }

        super.updateProps(filterProps(oldProps ?? {}, PROPS), filterProps(newProps, PROPS));
    }
}

registerNodeClass(StackNode);
