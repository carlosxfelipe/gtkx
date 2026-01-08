import type * as Gdk from "@gtkx/ffi/gdk";
import type * as Gtk from "@gtkx/ffi/gtk";

export type Container = Gtk.Widget | Gtk.Application;

export type Props = Record<string, unknown>;

export type ContainerClass = typeof Gtk.Widget | typeof Gtk.Application;

/**
 * Props for EventController-based event handlers.
 *
 * These props attach EventControllers to widgets for handling
 * pointer motion, clicks, and keyboard events.
 */
export interface EventControllerProps {
    /** Called when the pointer enters the widget */
    onEnter?: (x: number, y: number) => void;
    /** Called when the pointer leaves the widget */
    onLeave?: () => void;
    /** Called when the pointer moves over the widget */
    onMotion?: (x: number, y: number) => void;
    /** Called when a mouse button is pressed */
    onPressed?: (nPress: number, x: number, y: number) => void;
    /** Called when a mouse button is released */
    onReleased?: (nPress: number, x: number, y: number) => void;
    /** Called when a key is pressed (for focusable widgets) */
    onKeyPressed?: (keyval: number, keycode: number, state: Gdk.ModifierType) => boolean;
    /** Called when a key is released */
    onKeyReleased?: (keyval: number, keycode: number, state: Gdk.ModifierType) => void;
    /** Called when the widget is scrolled */
    onScroll?: (dx: number, dy: number) => boolean;
}
