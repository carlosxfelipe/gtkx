import { getObjectId, type ObjectId } from "@gtkx/native";

/**
 * Base class for all GTK/GLib object wrappers.
 *
 * Provides common functionality for native object representation including
 * type metadata and equality comparison.
 *
 * @see {@link getNativeObject} for creating wrapper instances
 */
export abstract class NativeObject {
    /** The GLib type name (e.g., "GtkButton", "AdwHeaderBar") */
    static readonly glibTypeName: string;

    /** The type category: gobject, interface, boxed, gvariant, struct, or gparam */
    static readonly objectType: "gobject" | "interface" | "boxed" | "gvariant" | "struct" | "gparam";

    /** Native object ID */
    id: ObjectId;

    // biome-ignore lint/suspicious/noExplicitAny: Required for NativeClass type compatibility
    constructor(..._args: any[]) {
        this.id = undefined as unknown as ObjectId;
    }

    /** Retrieves the native ID memory address as a number */
    getIdValue(): number {
        return getObjectId(this.id);
    }

    /**
     * Compares this object to another for equality.
     *
     * Objects are equal if they wrap the same native ID.
     *
     * @param other - Object to compare against
     * @returns `true` if both wrap the same native object
     */
    equals(other: unknown): boolean {
        if (!(other instanceof NativeObject)) return false;
        return this.getIdValue() === other.getIdValue();
    }
}

/**
 * Constructor type for native object wrapper classes.
 *
 * @typeParam T - The wrapped object type
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for contravariant behavior
export type NativeClass<T extends NativeObject = NativeObject> = typeof NativeObject & (new (...args: any[]) => T);

/**
 * Flag indicating if a native object is currently being instantiated.
 *
 * @internal
 */
export let isInstantiating = false;

/**
 * Sets the instantiation flag.
 *
 * @internal
 */
export const setInstantiating = (value: boolean): void => {
    isInstantiating = value;
};

export type { ObjectId };
