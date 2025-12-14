import { getCurrentApp } from "@gtkx/ffi";
import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";
import { getNumberProp } from "../props.js";

const WINDOW_TYPES = new Set(["Window", "ApplicationWindow", "AdwWindow", "AdwApplicationWindow"]);

export class WindowNode extends Node<Gtk.Window> {
    static matches(type: string): boolean {
        return WINDOW_TYPES.has(type.split(".")[0] || type);
    }

    protected override createWidget(type: string, _props: Props): Gtk.Window {
        const normalizedType = type.split(".")[0] || type;

        if (normalizedType === "ApplicationWindow") {
            return new Gtk.ApplicationWindow(getCurrentApp());
        }

        if (normalizedType === "AdwApplicationWindow") {
            return new Adw.ApplicationWindow(getCurrentApp());
        }

        if (normalizedType === "AdwWindow") {
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

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();
        consumed.add("defaultWidth");
        consumed.add("defaultHeight");
        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        const widthChanged = oldProps.defaultWidth !== newProps.defaultWidth;
        const heightChanged = oldProps.defaultHeight !== newProps.defaultHeight;

        if (widthChanged || heightChanged) {
            const width = getNumberProp(newProps, "defaultWidth", -1);
            const height = getNumberProp(newProps, "defaultHeight", -1);
            this.widget.setDefaultSize(width, height);
        }

        super.updateProps(oldProps, newProps);
    }
}
