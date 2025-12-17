import { start } from "@gtkx/ffi";
import type * as Gio from "@gtkx/ffi/gio";
import type { ReactNode } from "react";
import { formatBoundaryError, formatRenderError } from "./errors.js";
import { ROOT_NODE_CONTAINER } from "./factory.js";
import { reconciler } from "./reconciler.js";

let container: unknown = null;

export const getContainer = (): unknown => container;

/**
 * Renders a React element tree as a GTK application.
 * This is the main entry point for GTKX applications.
 *
 * @example
 * ```tsx
 * render(
 *   <ApplicationWindow title="My App">
 *     Hello, GTKX!
 *   </ApplicationWindow>,
 *   "com.example.myapp"
 * );
 * ```
 *
 * @param element - The root React element to render
 * @param appId - The application ID (e.g., "com.example.myapp")
 * @param flags - Optional GIO application flags
 */
export const render = (element: ReactNode, appId: string, flags?: Gio.ApplicationFlags): void => {
    start(appId, flags);
    const instance = reconciler.getInstance();

    container = instance.createContainer(
        ROOT_NODE_CONTAINER,
        0,
        null,
        false,
        null,
        "",
        (error: unknown) => {
            throw formatRenderError(error);
        },
        (error: unknown) => {
            const formattedError = formatBoundaryError(error);
            console.error(formattedError.toString());
        },
        () => {},
        () => {},
        null,
    );

    instance.updateContainer(element, container, null, () => {});
};
