import type * as Gtk from "@gtkx/ffi/gtk";
import type Reconciler from "react-reconciler";
import { ROOT_NODE_CONTAINER } from "./factory.js";
import { reconciler } from "./reconciler.js";

/**
 * Creates a new fiber root container for rendering React elements.
 * @param container - Optional GTK widget to use as the container. If not provided,
 *                    uses the ROOT_NODE_CONTAINER sentinel for virtual roots.
 */
export const createFiberRoot = (container?: Gtk.Widget): Reconciler.FiberRoot => {
    const instance = reconciler.getInstance();

    return instance.createContainer(
        container ?? ROOT_NODE_CONTAINER,
        0,
        null,
        false,
        null,
        "",
        (error: Error) => console.error("Fiber root render error:", error),
        () => {},
        () => {},
        () => {},
        null,
    );
};
