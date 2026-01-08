import * as Adw from "@gtkx/ffi/adw";
import type { ToggleProps } from "../jsx.js";
import { registerNodeClass } from "../registry.js";
import { CommitPriority, scheduleAfterCommit } from "../scheduler.js";
import { VirtualNode } from "./virtual.js";

export class ToggleNode extends VirtualNode<ToggleProps> {
    public static override priority = 1;

    private toggleGroup?: Adw.ToggleGroup;
    private toggle?: Adw.Toggle;

    public static override matches(type: string): boolean {
        return type === "Toggle";
    }

    public setToggleGroup(toggleGroup: Adw.ToggleGroup): void {
        this.toggleGroup = toggleGroup;
    }

    public addToGroup(): void {
        if (!this.toggleGroup || this.toggle) return;

        const toggleGroup = this.toggleGroup;
        this.toggle = new Adw.Toggle();

        scheduleAfterCommit(() => {
            if (this.toggle) {
                this.applyProps(this.props);
                toggleGroup.add(this.toggle);
            }
        });
    }

    public removeFromGroup(): void {
        if (!this.toggleGroup || !this.toggle) return;

        const toggleGroup = this.toggleGroup;
        const toggle = this.toggle;
        this.toggle = undefined;

        scheduleAfterCommit(() => {
            toggleGroup.remove(toggle);
        }, CommitPriority.HIGH);
    }

    public override updateProps(oldProps: ToggleProps | null, newProps: ToggleProps): void {
        super.updateProps(oldProps, newProps);

        if (oldProps && this.toggle) {
            this.applyProps(newProps);
        }
    }

    public override unmount(): void {
        this.removeFromGroup();
        super.unmount();
    }

    private applyProps(props: ToggleProps): void {
        if (!this.toggle) return;

        if (props.id !== undefined && props.id !== this.toggle.getName()) {
            this.toggle.setName(props.id);
        }
        if (props.label !== undefined && props.label !== this.toggle.getLabel()) {
            this.toggle.setLabel(props.label);
        }
        if (props.iconName !== undefined && props.iconName !== this.toggle.getIconName()) {
            this.toggle.setIconName(props.iconName);
        }
        if (props.tooltip !== undefined && props.tooltip !== this.toggle.getTooltip()) {
            this.toggle.setTooltip(props.tooltip);
        }
        if (props.enabled !== undefined && props.enabled !== this.toggle.getEnabled()) {
            this.toggle.setEnabled(props.enabled);
        }
        if (props.useUnderline !== undefined && props.useUnderline !== this.toggle.getUseUnderline()) {
            this.toggle.setUseUnderline(props.useUnderline);
        }
    }
}

registerNodeClass(ToggleNode);
