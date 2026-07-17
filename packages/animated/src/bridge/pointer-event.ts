import type * as Gtk from "@gtkx/gi/gtk";
import type { SyntheticEvent } from "../motion-env.js";
import { toRootPoint } from "./geometry.js";

/**
 * Builds a pointer event from a live GTK4 gesture, suitable for `DragControls.start`.
 * Call it from a gesture signal handler (for example `GtkGestureDrag`'s `onDragBegin`)
 * on the drag handle widget.
 */
export const pointerEventFromController = (gesture: Gtk.Gesture): SyntheticEvent => {
    const widget = gesture.getWidget();
    const [ok, x, y] = gesture.getPoint(null);
    const page = widget && ok ? toRootPoint(widget, x, y) : { x: 0, y: 0 };
    return {
        type: "pointerdown",
        pageX: page.x,
        pageY: page.y,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
    };
};
