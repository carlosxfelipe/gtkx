import type * as GObject from "@gtkx/gi/gobject";
import { propToNotifySignal } from "../utils/notify-name.js";
import type { ObjectProp } from "../utils/object-prop.js";
import { useObjectValue } from "./use-object-value.js";

type ReadableKey<T> = {
    [K in keyof T]: K extends `__${string}__`
        ? never
        : K extends string
          ? T[K] extends (...args: unknown[]) => unknown
              ? never
              : K
          : never;
}[keyof T];

/**
 * Subscribes to a GObject property and returns its current value, re-rendering when the property changes.
 *
 * @param object The GObject (or ref to one) whose property to observe.
 * @param propertyName The name of a readable property on the object.
 * @returns The current property value, or `undefined` when the object is not resolved.
 */
export function useProperty<T extends GObject.Object, K extends ReadableKey<T>>(
    object: ObjectProp<T>,
    propertyName: K,
): T[K] | undefined {
    return useObjectValue(object, propToNotifySignal(propertyName), (obj) => (obj ? obj[propertyName] : undefined));
}
