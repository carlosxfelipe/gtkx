import * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import { VirtualNode } from "./virtual.js";

export type ScaleMarkProps = {
    value: number;
    position?: Gtk.PositionType;
    label?: string | null;
};

export class ScaleMarkNode extends VirtualNode<ScaleMarkProps> {
    public static override priority = 1;

    private scale?: Gtk.Scale;
    private onRebuild?: () => void;

    public static override matches(type: string): boolean {
        return type === "ScaleMark";
    }

    public setScale(scale: Gtk.Scale, onRebuild: () => void): void {
        this.scale = scale;
        this.onRebuild = onRebuild;
    }

    public addMark(): void {
        if (!this.scale) return;

        const { value, position, label } = this.props;
        this.scale.addMark(value, position ?? Gtk.PositionType.BOTTOM, label);
    }

    public override updateProps(oldProps: ScaleMarkProps | null, newProps: ScaleMarkProps): void {
        super.updateProps(oldProps, newProps);

        if (oldProps && this.scale) {
            const changed =
                oldProps.value !== newProps.value ||
                oldProps.position !== newProps.position ||
                oldProps.label !== newProps.label;

            if (changed) {
                this.onRebuild?.();
            }
        }
    }

    public override unmount(): void {
        this.scale = undefined;
        this.onRebuild = undefined;
        super.unmount();
    }
}

registerNodeClass(ScaleMarkNode);
