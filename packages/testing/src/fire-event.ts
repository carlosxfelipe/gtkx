import type * as Gtk from "@gtkx/ffi/gtk";
import { call } from "@gtkx/native";

const hasToggle = (
    widget: Gtk.Widget,
): widget is Gtk.Widget & { getActive(): boolean; setActive(active: boolean): void } =>
    "getActive" in widget &&
    typeof widget.getActive === "function" &&
    "setActive" in widget &&
    typeof widget.setActive === "function";

const emitSignal = (widget: Gtk.Widget, signalName: string): void => {
    call(
        "libgobject-2.0.so.0",
        "g_signal_emit_by_name",
        [
            { type: { type: "gobject" }, value: widget.ptr },
            { type: { type: "string" }, value: signalName },
        ],
        { type: "undefined" },
    );
};

type FireEventFunction = {
    (element: Gtk.Widget, signalName: string): void;
    click: (element: Gtk.Widget) => void;
    activate: (element: Gtk.Widget) => void;
    toggled: (element: Gtk.Widget) => void;
    changed: (element: Gtk.Widget) => void;
};

/**
 * Fires GTK signals on widgets for testing. Can be called directly with a signal
 * name or using convenience methods like fireEvent.click().
 *
 * Supported signals: "clicked", "activate", "toggled", "changed"
 *
 * @example
 * fireEvent.click(button)
 * fireEvent.activate(widget)
 */
export const fireEvent: FireEventFunction = Object.assign(
    (element: Gtk.Widget, signalName: string): void => {
        switch (signalName) {
            case "clicked":
                emitSignal(element, "clicked");
                break;
            case "activate":
                element.activate();
                break;
            case "toggled":
                if (hasToggle(element)) {
                    element.setActive(!element.getActive());
                }
                break;
            case "changed":
                emitSignal(element, "changed");
                break;
            default:
                throw new Error(
                    `fireEvent: Signal "${signalName}" is not supported. ` +
                        `Supported signals: clicked, activate, toggled, changed`,
                );
        }
    },
    {
        click: (element: Gtk.Widget): void => {
            emitSignal(element, "clicked");
        },
        activate: (element: Gtk.Widget): void => {
            element.activate();
        },
        toggled: (element: Gtk.Widget): void => {
            if (hasToggle(element)) {
                element.setActive(!element.getActive());
            }
        },
        changed: (element: Gtk.Widget): void => {
            emitSignal(element, "changed");
        },
    },
);
