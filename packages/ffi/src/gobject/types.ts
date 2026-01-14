import { typeFromName } from "../generated/gobject/functions.js";

let invalidType: number | undefined;
let noneType: number | undefined;
let interfaceType: number | undefined;
let charType: number | undefined;
let ucharType: number | undefined;
let booleanType: number | undefined;
let intType: number | undefined;
let uintType: number | undefined;
let longType: number | undefined;
let ulongType: number | undefined;
let int64Type: number | undefined;
let uint64Type: number | undefined;
let enumType: number | undefined;
let flagsType: number | undefined;
let floatType: number | undefined;
let doubleType: number | undefined;
let stringType: number | undefined;
let pointerType: number | undefined;
let boxedType: number | undefined;
let paramType: number | undefined;
let objectType: number | undefined;
let variantType: number | undefined;

/**
 * Fundamental GLib type constants.
 *
 * Provides lazy-loaded GType identifiers for primitive and object types.
 * Use with {@link Value} factory methods that require explicit type specification.
 *
 * @example
 * ```ts
 * import { Type, Value } from "@gtkx/ffi/gobject";
 *
 * const enumValue = Value.newFromEnum(myEnumGType, 0);
 * console.log(Type.STRING); // GType for gchararray
 * ```
 */
export const Type = {
    get INVALID(): number {
        invalidType ??= typeFromName("void");
        return invalidType;
    },
    get NONE(): number {
        noneType ??= typeFromName("void");
        return noneType;
    },
    get INTERFACE(): number {
        interfaceType ??= typeFromName("GInterface");
        return interfaceType;
    },
    get CHAR(): number {
        charType ??= typeFromName("gchar");
        return charType;
    },
    get UCHAR(): number {
        ucharType ??= typeFromName("guchar");
        return ucharType;
    },
    get BOOLEAN(): number {
        booleanType ??= typeFromName("gboolean");
        return booleanType;
    },
    get INT(): number {
        intType ??= typeFromName("gint");
        return intType;
    },
    get UINT(): number {
        uintType ??= typeFromName("guint");
        return uintType;
    },
    get LONG(): number {
        longType ??= typeFromName("glong");
        return longType;
    },
    get ULONG(): number {
        ulongType ??= typeFromName("gulong");
        return ulongType;
    },
    get INT64(): number {
        int64Type ??= typeFromName("gint64");
        return int64Type;
    },
    get UINT64(): number {
        uint64Type ??= typeFromName("guint64");
        return uint64Type;
    },
    get ENUM(): number {
        enumType ??= typeFromName("GEnum");
        return enumType;
    },
    get FLAGS(): number {
        flagsType ??= typeFromName("GFlags");
        return flagsType;
    },
    get FLOAT(): number {
        floatType ??= typeFromName("gfloat");
        return floatType;
    },
    get DOUBLE(): number {
        doubleType ??= typeFromName("gdouble");
        return doubleType;
    },
    get STRING(): number {
        stringType ??= typeFromName("gchararray");
        return stringType;
    },
    get POINTER(): number {
        pointerType ??= typeFromName("gpointer");
        return pointerType;
    },
    get BOXED(): number {
        boxedType ??= typeFromName("GBoxed");
        return boxedType;
    },
    get PARAM(): number {
        paramType ??= typeFromName("GParam");
        return paramType;
    },
    get OBJECT(): number {
        objectType ??= typeFromName("GObject");
        return objectType;
    },
    get VARIANT(): number {
        variantType ??= typeFromName("GVariant");
        return variantType;
    },
};
