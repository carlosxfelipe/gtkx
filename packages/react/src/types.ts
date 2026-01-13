import type * as Gdk from "@gtkx/ffi/gdk";
import type * as GObject from "@gtkx/ffi/gobject";
import type * as Gtk from "@gtkx/ffi/gtk";

export type Container = Gtk.Widget | Gtk.Application;

export type Props = Record<string, unknown>;

export type ContainerClass = typeof Gtk.Widget | typeof Gtk.Application;

/**
 * Props for EventController-based event handlers.
 *
 * These props attach EventControllers to widgets for handling
 * pointer motion, clicks, keyboard events, and drag-and-drop.
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

/**
 * Props for DragSource controller.
 *
 * Enables dragging content from a widget. Attach a DragSource to make
 * a widget draggable.
 */
export interface DragSourceProps {
    /**
     * Called when a drag is about to start. Return a ContentProvider with the data
     * to be dragged, or null to cancel the drag.
     * @param x - X coordinate where drag started
     * @param y - Y coordinate where drag started
     */
    onDragPrepare?: (x: number, y: number) => Gdk.ContentProvider | null;
    /**
     * Called when the drag operation begins.
     * @param drag - The Gdk.Drag object representing the ongoing drag
     */
    onDragBegin?: (drag: Gdk.Drag) => void;
    /**
     * Called when the drag operation ends.
     * @param drag - The Gdk.Drag object
     * @param deleteData - Whether the data should be deleted (for move operations)
     */
    onDragEnd?: (drag: Gdk.Drag, deleteData: boolean) => void;
    /**
     * Called when the drag operation is cancelled.
     * @param drag - The Gdk.Drag object
     * @param reason - The reason for cancellation
     * @returns true if the cancel was handled
     */
    onDragCancel?: (drag: Gdk.Drag, reason: Gdk.DragCancelReason) => boolean;
    /**
     * The allowed drag actions (COPY, MOVE, LINK, ASK).
     * Defaults to Gdk.DragAction.COPY if not specified.
     */
    dragActions?: Gdk.DragAction;
}

/**
 * Props for DropTarget controller.
 *
 * Enables dropping content onto a widget. Attach a DropTarget to make
 * a widget accept drops.
 */
export interface DropTargetProps {
    /**
     * Called when content is dropped on the widget.
     * @param value - The dropped value (use value.getTypeName() to check type, then extract)
     * @param x - X coordinate of drop
     * @param y - Y coordinate of drop
     * @returns true if the drop was accepted
     */
    onDrop?: (value: GObject.Value, x: number, y: number) => boolean;
    /**
     * Called when a drag enters the widget bounds.
     * @param x - X coordinate
     * @param y - Y coordinate
     * @returns The preferred action, or 0 to reject
     */
    onDropEnter?: (x: number, y: number) => Gdk.DragAction;
    /**
     * Called when a drag leaves the widget bounds.
     */
    onDropLeave?: () => void;
    /**
     * Called when a drag moves within the widget bounds.
     * @param x - X coordinate
     * @param y - Y coordinate
     * @returns The preferred action, or 0 to reject
     */
    onDropMotion?: (x: number, y: number) => Gdk.DragAction;
    /**
     * The allowed drop actions (COPY, MOVE, LINK, ASK).
     * Defaults to Gdk.DragAction.COPY if not specified.
     */
    dropActions?: Gdk.DragAction;
    /**
     * Array of GTypes that this drop target accepts.
     * Use typeFromName() to get GType values (e.g., typeFromName("gchararray") for strings).
     */
    dropTypes?: number[];
}
