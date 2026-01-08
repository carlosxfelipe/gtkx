import type * as Gtk from "@gtkx/ffi/gtk";
import type { LevelBarOffsetProps } from "../jsx.js";
import { registerNodeClass } from "../registry.js";
import { VirtualNode } from "./virtual.js";

export class LevelBarOffsetNode extends VirtualNode<LevelBarOffsetProps> {
    public static override priority = 1;

    private levelBar?: Gtk.LevelBar;

    public static override matches(type: string): boolean {
        return type === "LevelBarOffset";
    }

    public setLevelBar(levelBar: Gtk.LevelBar): void {
        this.levelBar = levelBar;
    }

    public addOffset(): void {
        this.levelBar?.addOffsetValue(this.props.id, this.props.value);
    }

    public removeOffset(): void {
        this.levelBar?.removeOffsetValue(this.props.id);
    }

    public override updateProps(oldProps: LevelBarOffsetProps | null, newProps: LevelBarOffsetProps): void {
        super.updateProps(oldProps, newProps);

        if (oldProps && this.levelBar) {
            if (oldProps.id !== newProps.id) {
                this.levelBar.removeOffsetValue(oldProps.id);
                this.levelBar.addOffsetValue(newProps.id, newProps.value);
            } else if (oldProps.value !== newProps.value) {
                this.levelBar.addOffsetValue(newProps.id, newProps.value);
            }
        }
    }

    public override unmount(): void {
        this.removeOffset();
        super.unmount();
    }
}

registerNodeClass(LevelBarOffsetNode);
