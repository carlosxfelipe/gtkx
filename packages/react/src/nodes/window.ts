import { getCurrentApp } from "@gtkx/ffi";
import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node, normalizeWidgetType } from "../node.js";

const WINDOW_TYPES = new Set(["Window", "ApplicationWindow", "AdwWindow", "AdwApplicationWindow"]);

export class WindowNode extends Node<Gtk.Window> {
    static override consumedPropNames = ["defaultWidth", "defaultHeight"];

    static matches(type: string): boolean {
        return WINDOW_TYPES.has(normalizeWidgetType(type));
    }

    protected override createWidget(type: string, _props: Props): Gtk.Window {
        const widgetType = normalizeWidgetType(type);

        if (widgetType === "ApplicationWindow") {
            return new Gtk.ApplicationWindow(getCurrentApp());
        }

        if (widgetType === "AdwApplicationWindow") {
            return new Adw.ApplicationWindow(getCurrentApp());
        }

        if (widgetType === "AdwWindow") {
            return new Adw.Window();
        }

        return new Gtk.Window();
    }

    override detachFromParent(_parent: Node): void {
        this.widget.destroy();
    }

    override mount(): void {
        this.widget.present();
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        const widthChanged = oldProps.defaultWidth !== newProps.defaultWidth;
        const heightChanged = oldProps.defaultHeight !== newProps.defaultHeight;

        if (widthChanged || heightChanged) {
            const width = (newProps.defaultWidth as number | undefined) ?? -1;
            const height = (newProps.defaultHeight as number | undefined) ?? -1;
            this.widget.setDefaultSize(width, height);
        }

        super.updateProps(oldProps, newProps);
    }
}
