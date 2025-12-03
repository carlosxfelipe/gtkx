import { start, stop } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import type React from "react";
import type Reconciler from "react-reconciler";
import { afterEach, beforeAll } from "vitest";
import { reconciler } from "../src/reconciler.js";

const APP_ID = "com.gtkx.test.react";

let app: Gtk.Application | null = null;
let container: Reconciler.FiberRoot | null = null;

export const getApp = (): Gtk.Application => {
    if (!app) {
        throw new Error("GTK app not initialized. Call setupTests() in your test file.");
    }
    return app;
};

const getInstance = () => reconciler.getInstance();

type ReconcilerInstance = ReturnType<typeof reconciler.getInstance>;

const updateSync = (instance: ReconcilerInstance, element: React.ReactNode, fiberRoot: Reconciler.FiberRoot): void => {
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

export const render = (element: React.ReactNode): void => {
    if (!container) {
        throw new Error("Test container not initialized. Call setupTests() in your test file.");
    }
    const instance = getInstance();
    updateSync(instance, element, container);
};

export const flushSync = (fn: () => void): void => {
    const instance = getInstance();
    const instanceAny = instance as unknown as Record<string, unknown>;

    if (typeof instanceAny.flushSync === "function") {
        (instanceAny.flushSync as (fn: () => void) => void)(fn);
    } else {
        fn();
        if (typeof instanceAny.flushSyncWork === "function") {
            (instanceAny.flushSyncWork as () => void)();
        }
    }

    instance.flushPassiveEffects();
};

const cleanup = (): void => {
    if (container) {
        const instance = getInstance();
        updateSync(instance, null, container);
    }
};

export const setupTests = () => {
    beforeAll(() => {
        if (!app) {
            app = start(APP_ID);
            reconciler.setApp(app);
            const instance = getInstance();
            container = instance.createContainer(
                app,
                0,
                null,
                false,
                false,
                "",
                (error: Error) => console.error("Test reconciler error:", error),
                () => {},
                () => {},
                () => {},
                null,
            );
        }
    });

    afterEach(() => {
        cleanup();
    });
};

export const teardown = () => {
    if (app) {
        cleanup();
        stop();
        app = null;
        container = null;
    }
};
