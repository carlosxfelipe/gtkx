import { EventEmitter } from "node:events";
import { getObjectId, start as nativeStart, stop as nativeStop } from "@gtkx/native";
import { init as initAdwaita } from "./generated/adw/functions.js";
import type { ApplicationFlags } from "./generated/gio/enums.js";
import {
    typeCheckInstanceIsA,
    typeFromName,
    typeName,
    typeNameFromInstance,
    typeParent,
} from "./generated/gobject/functions.js";
import type { Application } from "./generated/gtk/application.js";
import { finalize as finalizeGtkSource, init as initGtkSource } from "./generated/gtksource/functions.js";
import { getClassByTypeName, type NativeObject } from "./registry.js";

type NativeEventMap = {
    start: [];
    stop: [];
};

let currentApp: Application | null = null;
let keepAliveTimeout: NodeJS.Timeout | null = null;

/**
 * Event emitter for GTK lifecycle events.
 * Emits "start" when GTK is initialized and "stop" before shutdown.
 */
export const events = new EventEmitter<NativeEventMap>();

/**
 * Finds the nearest registered class by walking up the type hierarchy.
 * @param glibTypeName - The GLib type name to start from
 * @returns The registered class, or undefined if none found
 */
const findRegisteredClass = (glibTypeName: string) => {
    let currentTypeName: string | null = glibTypeName;

    while (currentTypeName) {
        const cls = getClassByTypeName(currentTypeName);
        if (cls) return cls;

        const gtype = typeFromName(currentTypeName);
        if (gtype === 0) break;

        const parentGtype = typeParent(gtype);
        if (parentGtype === 0) break;

        currentTypeName = typeName(parentGtype);
    }

    return undefined;
};

/**
 * Wraps a native pointer in a class instance without calling the constructor.
 * Uses GLib's type system to determine the actual runtime type and wraps
 * with the correct class prototype. If the exact type is not registered,
 * walks up the type hierarchy to find the nearest registered parent class.
 * @param id - The native pointer to wrap
 * @returns A new instance with the pointer attached
 * @throws Error if no registered class is found in the type hierarchy
 */
export function getObject<T extends NativeObject = NativeObject>(id: unknown): T {
    if (id === null || id === undefined) {
        throw new Error("getObject: id cannot be null or undefined");
    }

    const objectId = getObjectId(id);
    if (objectId === null || objectId === undefined) {
        throw new Error("getObject: failed to get object ID from input");
    }

    const runtimeTypeName = typeNameFromInstance(objectId);
    const cls = findRegisteredClass(runtimeTypeName);
    if (!cls) {
        throw new Error(`Unknown GLib type: ${runtimeTypeName}. Make sure the class is registered.`);
    }
    const instance = Object.create(cls.prototype) as T;
    instance.id = id;
    return instance;
}

/**
 * Wraps a native boxed type pointer in a class instance.
 * Unlike getObject(), this does NOT call typeNameFromInstance() because boxed
 * types don't have embedded type information like GObjects do.
 * @param id - The native pointer to wrap
 * @param glibTypeName - The GLib type name (e.g., "GdkRGBA")
 * @returns A new instance with the pointer attached
 * @throws Error if the type is not registered
 */
export function getBoxed<T extends NativeObject = NativeObject>(id: unknown, glibTypeName: string): T {
    if (id === null || id === undefined) {
        throw new Error("getBoxed: id cannot be null or undefined");
    }

    const cls = getClassByTypeName(glibTypeName);
    if (!cls) {
        throw new Error(`Unknown boxed type: ${glibTypeName}. Make sure the class is registered.`);
    }
    const instance = Object.create(cls.prototype) as T;
    instance.id = id;
    return instance;
}

type TypeWithGlibTypeName<T extends NativeObject> = {
    glibTypeName: string;
    prototype: T;
    fromPtr(ptr: unknown): T;
};

/**
 * Wraps a native pointer as an interface instance.
 * Returns null if the object does not implement the requested interface.
 * @param id - The native pointer to wrap
 * @param targetType - The interface type to cast to
 * @returns A new instance with the correct prototype, or null if not implemented
 */
export const getInterface = <T extends NativeObject>(id: unknown, targetType: TypeWithGlibTypeName<T>): T | null => {
    const targetGType = typeFromName(targetType.glibTypeName);
    if (targetGType === 0) return null;

    const objId = getObjectId(id);
    if (!typeCheckInstanceIsA(objId, targetGType)) return null;

    return targetType.fromPtr(id);
};

const keepAlive = (): void => {
    keepAliveTimeout = setTimeout(() => keepAlive(), 2147483647);
};

/**
 * Starts the GTK application with the given application ID.
 * Sets up a keep-alive timer to prevent Node.js from exiting.
 * This function is idempotent - calling it multiple times returns the existing app.
 * @param appId - The application ID (e.g., "com.example.myapp")
 * @param flags - Optional GIO application flags
 * @returns The GTK Application instance
 */
export const start = (appId: string, flags?: ApplicationFlags): Application => {
    if (currentApp) {
        return currentApp;
    }

    const app = nativeStart(appId, flags);
    currentApp = getObject<Application>(app);
    events.emit("start");

    try {
        initAdwaita();
    } catch {
        // Adwaita is optional - silently continue if not available
    }

    try {
        initGtkSource();
    } catch {
        // GtkSourceView is optional - silently continue if not available
    }

    keepAlive();

    return currentApp;
};

/**
 * Gets the current GTK application instance.
 * @returns The GTK Application instance
 * @throws Error if GTK has not been started yet
 */
export const getCurrentApp = (): Application => {
    if (!currentApp) {
        throw new Error("GTK application not initialized. Call start() first.");
    }
    return currentApp;
};

/**
 * Stops the GTK application and cleans up the keep-alive timer.
 * Emits the "stop" event before shutting down to allow cleanup.
 * This function is idempotent - calling it when not started does nothing.
 */
export const stop = (): void => {
    if (!currentApp) {
        return;
    }

    if (keepAliveTimeout) {
        clearTimeout(keepAliveTimeout);
        keepAliveTimeout = null;
    }

    events.emit("stop");

    try {
        finalizeGtkSource();
    } catch {
        // GtkSourceView finalization is optional - silently continue if not available
    }

    nativeStop();
    currentApp = null;
};

export { createRef, getObjectId } from "@gtkx/native";
export { beginBatch, call, endBatch, isBatching } from "./batch.js";
export { type NativeObject, registerType } from "./registry.js";

/**
 * Flag to prevent intermediate base class constructors from creating objects.
 * When a subclass is being instantiated, this flag is set to true to skip
 * object creation in parent constructors. Only the outermost constructor
 * will create the actual native object.
 */
export let isInstantiating = false;

export const setInstantiating = (value: boolean): void => {
    isInstantiating = value;
};
