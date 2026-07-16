import "../motion-env.js";
import * as Gtk from "@gtkx/gi/gtk";
import { Feature, type VisualElement } from "motion-dom";
import { rootWidgetOf } from "../bridge/geometry.js";
import { WidgetProxy } from "../bridge/widget-proxy.js";

export class GtkFocusFeature extends Feature<unknown> {
    private controller: Gtk.EventControllerFocus | null = null;
    private isActive = false;

    constructor(node: unknown) {
        super(node as VisualElement<unknown>);
    }

    private currentProxy(): WidgetProxy | null {
        const current = this.node.current;
        return current instanceof WidgetProxy ? current : null;
    }

    private onFocusEnter = (): void => {
        const proxy = this.currentProxy();
        if (!proxy) return;
        const root = rootWidgetOf(proxy.widget);
        if (root instanceof Gtk.Window && !root.getFocusVisible()) return;
        this.node.animationState?.setActive("whileFocus", true);
        this.isActive = true;
    };

    private onFocusLeave = (): void => {
        if (!this.isActive) return;
        this.isActive = false;
        this.node.animationState?.setActive("whileFocus", false);
    };

    mount(): void {
        const proxy = this.currentProxy();
        if (!proxy) return;
        const controller = new Gtk.EventControllerFocus();
        controller.on("enter", this.onFocusEnter);
        controller.on("leave", this.onFocusLeave);
        proxy.widget.addController(controller);
        this.controller = controller;
    }

    unmount(): void {
        const proxy = this.currentProxy();
        if (this.controller && proxy) proxy.widget.removeController(this.controller);
        this.controller = null;
        this.isActive = false;
    }
}
