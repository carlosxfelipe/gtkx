import type * as Adw from "@gtkx/ffi/adw";
import { Node } from "../node.js";

type ToolbarViewSlotType = "Top" | "Bottom";

/**
 * Virtual node for AdwToolbarView Top and Bottom slots.
 * These slots use addTopBar/addBottomBar instead of setChild.
 */
export class ToolbarViewSlotNode extends Node<never> {
    static matches(type: string): boolean {
        if (!type.startsWith("AdwToolbarView.")) return false;
        const slot = type.split(".")[1];
        return slot === "Top" || slot === "Bottom";
    }

    protected override isVirtual(): boolean {
        return true;
    }

    private slotType: ToolbarViewSlotType;
    private parentNode: Node | null = null;
    private children: Node[] = [];

    constructor(type: string) {
        super(type);
        const slot = type.split(".")[1];

        if (slot !== "Top" && slot !== "Bottom") {
            throw new Error(`Invalid toolbar view slot type: ${type}`);
        }

        this.slotType = slot;
    }

    override appendChild(child: Node): void {
        const childWidget = child.getWidget();

        if (!childWidget) return;

        this.children.push(child);

        if (this.parentNode) {
            this.addBarToParent(childWidget);
        }
    }

    override removeChild(child: Node): void {
        const index = this.children.indexOf(child);

        if (index !== -1) {
            this.children.splice(index, 1);
        }

        const childWidget = child.getWidget();

        if (this.parentNode && childWidget) {
            this.removeBarFromParent(childWidget);
        }
    }

    override attachToParent(parent: Node): void {
        this.parentNode = parent;

        for (const child of this.children) {
            const childWidget = child.getWidget();

            if (childWidget) {
                this.addBarToParent(childWidget);
            }
        }
    }

    override detachFromParent(_parent: Node): void {
        for (const child of this.children) {
            const childWidget = child.getWidget();

            if (childWidget) {
                this.removeBarFromParent(childWidget);
            }
        }

        this.parentNode = null;
    }

    private addBarToParent(childWidget: unknown): void {
        const parentWidget = this.parentNode?.getWidget() as Adw.ToolbarView | undefined;

        if (!parentWidget) return;

        if (this.slotType === "Top") {
            parentWidget.addTopBar(childWidget as any);
        } else {
            parentWidget.addBottomBar(childWidget as any);
        }
    }

    private removeBarFromParent(childWidget: unknown): void {
        const parentWidget = this.parentNode?.getWidget() as Adw.ToolbarView | undefined;

        if (!parentWidget) return;

        parentWidget.remove(childWidget as any);
    }
}
