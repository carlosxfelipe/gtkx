import type { ReactNode } from "react";
import type Reconciler from "react-reconciler";
import { ROOT_NODE_CONTAINER } from "./factory.js";
import { reconciler } from "./reconciler.js";

/**
 * Synchronously renders a React element into a fiber root.
 * Uses flushSync to ensure immediate rendering, which is required
 * for GTK signal handlers that expect synchronous widget updates.
 */
export const updateSync = (element: ReactNode, fiberRoot: Reconciler.FiberRoot): void => {
    const instance = reconciler.getInstance();
    const instanceAny = instance as unknown as Record<string, unknown>;

    if (typeof instanceAny.flushSync === "function") {
        (instanceAny.flushSync as (fn: () => void) => void)(() => {
            instance.updateContainer(element, fiberRoot, null, () => {});
        });
    } else {
        if (typeof instanceAny.updateContainerSync === "function") {
            (instanceAny.updateContainerSync as typeof instance.updateContainer)(element, fiberRoot, null, () => {});
        } else {
            instance.updateContainer(element, fiberRoot, null, () => {});
        }
        if (typeof instanceAny.flushSyncWork === "function") {
            (instanceAny.flushSyncWork as () => void)();
        }
    }

    instance.flushPassiveEffects();
};

/**
 * Creates a new fiber root container for rendering React elements.
 */
export const createFiberRoot = (): Reconciler.FiberRoot => {
    const instance = reconciler.getInstance();

    return instance.createContainer(
        ROOT_NODE_CONTAINER,
        0,
        null,
        false,
        null,
        "",
        (error: Error) => console.error("List item render error:", error),
        () => {},
        () => {},
        () => {},
        null,
    );
};
