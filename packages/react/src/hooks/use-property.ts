import type * as GObject from "@gtkx/gi/gobject";
import { propToNotifySignal } from "../utils/notify-name.js";
import type { ObjectProp } from "../utils/object-prop.js";
import { useObjectValue } from "./use-object-value.js";

type PropertiesOf<T extends GObject.Object> = NonNullable<T["__properties__"]>;

export type PropertyNameOf<T extends GObject.Object> = keyof PropertiesOf<T> & keyof T & string;

/**
 * Subscribes to a GObject property and returns its current value, re-rendering when the property changes.
 *
 * @param object The GObject (or ref to one) whose property to observe.
 * @param propertyName The camelCase name of a readable property on the object.
 * @returns The current property value, or `undefined` when the object is not resolved.
 */
export function useProperty<T extends GObject.Object, K extends PropertyNameOf<T>>(
    object: ObjectProp<T>,
    propertyName: K,
): T[K] | undefined {
    return useObjectValue(object, propToNotifySignal(propertyName), (obj) => (obj ? obj[propertyName] : undefined));
}
