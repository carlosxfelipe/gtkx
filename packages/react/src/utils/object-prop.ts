import * as GObject from "@gtkx/gi/gobject";
import type { RefObject } from "react";

/**
 * An object accepted by the GObject-aware hooks: a GObject, a ref to one, or a nullish value.
 */
export type ObjectProp<T extends GObject.Object> = T | RefObject<T | null> | null | undefined;

export const resolveObjectProp = <T extends GObject.Object>(prop: ObjectProp<T>): T | null => {
    if (!prop) return null;
    if (prop instanceof GObject.Object) return prop;
    return prop.current;
};
