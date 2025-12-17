import { getCurrentApp, stop } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { Arg } from "@gtkx/native";
import { call } from "@gtkx/native";
import type React from "react";
import type Reconciler from "react-reconciler";
import { afterEach, beforeAll } from "vitest";
import { endCommit } from "../src/batch.js";
import { render as libraryRender } from "../src/index.js";
import { reconciler } from "../src/reconciler.js";
import { getContainer } from "../src/render.js";

export { getCurrentApp };

const APP_ID = "com.gtkx.test.react";

const getInstance = () => reconciler.getInstance();

type ReconcilerWithFlushSync = { flushSyncFromReconciler: (fn: () => void) => void };

const renderSync = (element: React.ReactNode): void => {
    const container = getContainer() as Reconciler.FiberRoot;
    const instance = getInstance();
    const instanceAny = instance as unknown as ReconcilerWithFlushSync;
    instanceAny.flushSyncFromReconciler(() => {
        instance.updateContainer(element, container, null, () => {});
    });
    instance.flushPassiveEffects();
};

export const render = (element: React.ReactNode): void => {
    const container = getContainer();
    if (!container) {
        throw new Error("Test container not initialized. Call setupTests() in your test file.");
    }
    renderSync(element);
};

export const flushSync = (fn: () => void): void => {
    const instance = getInstance();
    const instanceAny = instance as unknown as ReconcilerWithFlushSync;
    instanceAny.flushSyncFromReconciler(fn);
    instance.flushPassiveEffects();
};

export { update } from "../src/index.js";

const cleanup = (): void => {
    const container = getContainer();
    if (container) {
        renderSync(null);
    }
};

const setupTests = () => {
    beforeAll(() => {
        const container = getContainer();
        if (!container) {
            libraryRender(null, APP_ID);
        }
    });

    afterEach(() => {
        endCommit();
        cleanup();
    });
};

const teardown = () => {
    cleanup();
    stop();
};

export const flushMicrotasks = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve));

export const fireEvent = async (element: Gtk.Widget, signalName: string, ...args: Arg[]): Promise<void> => {
    call(
        "libgobject-2.0.so.0",
        "g_signal_emit_by_name",
        [{ type: { type: "gobject" }, value: element.id }, { type: { type: "string" }, value: signalName }, ...args],
        { type: "undefined" },
    );

    await flushMicrotasks();
};

setupTests();

export default async function globalSetup() {
    return async () => {
        teardown();
    };
}
