/**
 * Represents a parsed GIR namespace containing all type definitions.
 */
export interface GirNamespace {
    /** The namespace name (e.g., "Gtk", "Gio"). */
    name: string;
    /** The namespace version (e.g., "4.0"). */
    version: string;
    /** The shared library file name. */
    sharedLibrary: string;
    /** The C identifier prefix for this namespace. */
    cPrefix: string;
    /** All classes defined in this namespace. */
    classes: GirClass[];
    /** All interfaces defined in this namespace. */
    interfaces: GirInterface[];
    /** All standalone functions defined in this namespace. */
    functions: GirFunction[];
    /** All enumerations defined in this namespace. */
    enumerations: GirEnumeration[];
    /** All bitfield enumerations defined in this namespace. */
    bitfields: GirEnumeration[];
    /** Documentation for the namespace. */
    doc?: string;
}

/**
 * Represents a GIR interface definition.
 */
export interface GirInterface {
    /** The interface name. */
    name: string;
    /** The C type name. */
    cType: string;
    /** Methods defined on this interface. */
    methods: GirMethod[];
    /** Properties defined on this interface. */
    properties: GirProperty[];
    /** Signals defined on this interface. */
    signals: GirSignal[];
    /** Documentation for the interface. */
    doc?: string;
}

/**
 * Represents a GIR class definition.
 */
export interface GirClass {
    /** The class name. */
    name: string;
    /** The C type name. */
    cType: string;
    /** The parent class name, if any. */
    parent?: string;
    /** Whether this is an abstract class. */
    abstract?: boolean;
    /** List of interface names this class implements. */
    implements: string[];
    /** Methods defined on this class. */
    methods: GirMethod[];
    /** Constructor functions for this class. */
    constructors: GirConstructor[];
    /** Static functions defined on this class. */
    functions: GirFunction[];
    /** Properties defined on this class. */
    properties: GirProperty[];
    /** Signals defined on this class. */
    signals: GirSignal[];
    /** Documentation for the class. */
    doc?: string;
}

/**
 * Represents a GIR method definition.
 */
export interface GirMethod {
    /** The method name. */
    name: string;
    /** The C function identifier. */
    cIdentifier: string;
    /** The return type. */
    returnType: GirType;
    /** The method parameters. */
    parameters: GirParameter[];
    /** Whether this method can throw a GError. */
    throws?: boolean;
    /** Documentation for the method. */
    doc?: string;
}

/**
 * Represents a GIR constructor definition.
 */
export interface GirConstructor {
    /** The constructor name. */
    name: string;
    /** The C function identifier. */
    cIdentifier: string;
    /** The return type (typically the class type). */
    returnType: GirType;
    /** The constructor parameters. */
    parameters: GirParameter[];
    /** Documentation for the constructor. */
    doc?: string;
}

/**
 * Represents a GIR standalone function definition.
 */
export interface GirFunction {
    /** The function name. */
    name: string;
    /** The C function identifier. */
    cIdentifier: string;
    /** The return type. */
    returnType: GirType;
    /** The function parameters. */
    parameters: GirParameter[];
    /** Whether this function can throw a GError. */
    throws?: boolean;
    /** Documentation for the function. */
    doc?: string;
}

/**
 * Represents a GIR parameter definition.
 */
export interface GirParameter {
    /** The parameter name. */
    name: string;
    /** The parameter type. */
    type: GirType;
    /** The parameter direction (in, out, or inout). */
    direction?: "in" | "out" | "inout";
    /** Whether this parameter can be null. */
    nullable?: boolean;
    /** Whether this parameter is optional. */
    optional?: boolean;
    /** Documentation for the parameter. */
    doc?: string;
}

/**
 * Represents a GIR type reference.
 */
export interface GirType {
    /** The type name. */
    name: string;
    /** The C type name. */
    cType?: string;
    /** Whether this is an array type. */
    isArray?: boolean;
    /** The element type for array types. */
    elementType?: GirType;
}

/**
 * Represents a GIR property definition.
 */
export interface GirProperty {
    /** The property name. */
    name: string;
    /** The property type. */
    type: GirType;
    /** Whether this property is readable. */
    readable?: boolean;
    /** Whether this property is writable. */
    writable?: boolean;
    /** Whether this property can only be set at construction time. */
    constructOnly?: boolean;
    /** Whether this property has a default value. */
    hasDefault?: boolean;
    /** Documentation for the property. */
    doc?: string;
}

/**
 * Represents a GIR signal definition.
 */
export interface GirSignal {
    /** The signal name. */
    name: string;
    /** When the signal handler runs relative to the default handler. */
    when?: "first" | "last" | "cleanup";
    /** The signal return type. */
    returnType?: GirType;
    /** The signal parameters passed to handlers. */
    parameters?: GirParameter[];
    /** Documentation for the signal. */
    doc?: string;
}

/**
 * Represents a GIR enumeration or bitfield definition.
 */
export interface GirEnumeration {
    /** The enumeration name. */
    name: string;
    /** The C type name. */
    cType: string;
    /** The enumeration members. */
    members: GirEnumerationMember[];
    /** Documentation for the enumeration. */
    doc?: string;
}

/**
 * Represents a single enumeration member.
 */
export interface GirEnumerationMember {
    /** The member name. */
    name: string;
    /** The numeric value. */
    value: string;
    /** The C identifier. */
    cIdentifier: string;
    /** Documentation for the member. */
    doc?: string;
}

/**
 * Describes an FFI type for code generation.
 */
export interface FfiTypeDescriptor {
    /** The FFI type category. */
    type: string;
    /** Size in bits for integer/float types. */
    size?: number;
    /** Whether the integer type is unsigned. */
    unsigned?: boolean;
    /** Whether the pointer is borrowed (not owned). */
    borrowed?: boolean;
    /** Inner type for ref types. */
    innerType?: FfiTypeDescriptor;
    /** Item type for array types. */
    itemType?: FfiTypeDescriptor;
}

/**
 * Converts a snake_case or kebab-case string to camelCase.
 * @param str - The input string
 * @returns The camelCase version
 */
export const toCamelCase = (str: string): string => str.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * Converts a snake_case or kebab-case string to PascalCase.
 * @param str - The input string
 * @returns The PascalCase version
 */
export const toPascalCase = (str: string): string => {
    const camel = toCamelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
};

/**
 * Builds a map of class names to class definitions for quick lookup.
 * @param classes - Array of GIR class definitions
 * @returns Map from class name to class definition
 */
export const buildClassMap = (classes: GirClass[]): Map<string, GirClass> => {
    const classMap = new Map<string, GirClass>();
    for (const cls of classes) {
        classMap.set(cls.name, cls);
    }
    return classMap;
};

/**
 * Registers all enumerations and bitfields from a namespace with a type mapper.
 * @param typeMapper - The TypeMapper instance to register with
 * @param namespace - The GIR namespace containing enums to register
 */
export const registerEnumsFromNamespace = (typeMapper: TypeMapper, namespace: GirNamespace): void => {
    for (const enumeration of namespace.enumerations) {
        typeMapper.registerEnum(enumeration.name, toPascalCase(enumeration.name));
    }
    for (const bitfield of namespace.bitfields) {
        typeMapper.registerEnum(bitfield.name, toPascalCase(bitfield.name));
    }
};

type TypeMapping = { ts: string; ffi: FfiTypeDescriptor };

const BASIC_TYPE_MAP = new Map<string, TypeMapping>([
    ["gboolean", { ts: "boolean", ffi: { type: "boolean" } }],
    ["gchar", { ts: "number", ffi: { type: "int", size: 8, unsigned: false } }],
    ["guchar", { ts: "number", ffi: { type: "int", size: 8, unsigned: true } }],
    ["gint", { ts: "number", ffi: { type: "int", size: 32, unsigned: false } }],
    ["guint", { ts: "number", ffi: { type: "int", size: 32, unsigned: true } }],
    ["gshort", { ts: "number", ffi: { type: "int", size: 32, unsigned: false } }],
    ["gushort", { ts: "number", ffi: { type: "int", size: 32, unsigned: true } }],
    ["glong", { ts: "number", ffi: { type: "int", size: 64, unsigned: false } }],
    ["gulong", { ts: "number", ffi: { type: "int", size: 64, unsigned: true } }],
    ["GType", { ts: "number", ffi: { type: "int", size: 64, unsigned: true } }],
    ["gint8", { ts: "number", ffi: { type: "int", size: 8, unsigned: false } }],
    ["guint8", { ts: "number", ffi: { type: "int", size: 8, unsigned: true } }],
    ["gint16", { ts: "number", ffi: { type: "int", size: 32, unsigned: false } }],
    ["guint16", { ts: "number", ffi: { type: "int", size: 32, unsigned: true } }],
    ["gint32", { ts: "number", ffi: { type: "int", size: 32, unsigned: false } }],
    ["guint32", { ts: "number", ffi: { type: "int", size: 32, unsigned: true } }],
    ["gint64", { ts: "number", ffi: { type: "int", size: 64, unsigned: false } }],
    ["guint64", { ts: "number", ffi: { type: "int", size: 64, unsigned: true } }],
    ["gfloat", { ts: "number", ffi: { type: "float", size: 32 } }],
    ["gdouble", { ts: "number", ffi: { type: "float", size: 64 } }],
    ["utf8", { ts: "string", ffi: { type: "string" } }],
    ["filename", { ts: "string", ffi: { type: "string" } }],
    ["gpointer", { ts: "unknown", ffi: { type: "gobject" } }],
    ["gconstpointer", { ts: "unknown", ffi: { type: "gobject" } }],
    ["void", { ts: "void", ffi: { type: "undefined" } }],
    ["none", { ts: "void", ffi: { type: "undefined" } }],
    ["int", { ts: "number", ffi: { type: "int", size: 32, unsigned: false } }],
    ["uint", { ts: "number", ffi: { type: "int", size: 32, unsigned: true } }],
    ["long", { ts: "number", ffi: { type: "int", size: 64, unsigned: false } }],
    ["ulong", { ts: "number", ffi: { type: "int", size: 64, unsigned: true } }],
    ["size_t", { ts: "number", ffi: { type: "int", size: 64, unsigned: true } }],
    ["ssize_t", { ts: "number", ffi: { type: "int", size: 64, unsigned: false } }],
    ["double", { ts: "number", ffi: { type: "float", size: 64 } }],
    ["float", { ts: "number", ffi: { type: "float", size: 32 } }],
]);

const LIBRARY_MAP: Record<string, string> = {
    Gtk: "libgtk-4.so.1",
    GObject: "libgobject-2.0.so.0",
    GLib: "libglib-2.0.so.0",
    Gio: "libgio-2.0.so.0",
    GdkPixbuf: "libgdk_pixbuf-2.0.so.0",
    Pango: "libpango-1.0.so.0",
    Cairo: "libcairo.so.2",
};

/**
 * Maps GIR types to TypeScript types and FFI type descriptors.
 * Handles basic types, enumerations, arrays, and object references.
 */
export class TypeMapper {
    private enumNames: Set<string> = new Set();
    private enumTransforms: Map<string, string> = new Map();
    private onEnumUsed?: (enumName: string) => void;

    /**
     * Registers an enumeration type for mapping.
     * @param originalName - The original GIR enum name
     * @param transformedName - The transformed TypeScript enum name
     */
    registerEnum(originalName: string, transformedName?: string): void {
        this.enumNames.add(originalName);
        if (transformedName) {
            this.enumTransforms.set(originalName, transformedName);
        }
    }

    /**
     * Sets a callback to track enum usage during type mapping.
     * @param callback - Called when an enum is used, or null to clear
     */
    setEnumUsageCallback(callback: ((enumName: string) => void) | null): void {
        this.onEnumUsed = callback ?? undefined;
    }

    /**
     * Gets the current enum usage callback.
     * @returns The callback or null if not set
     */
    getEnumUsageCallback(): ((enumName: string) => void) | null {
        return this.onEnumUsed ?? null;
    }

    /**
     * Maps a GIR type to TypeScript and FFI type descriptors.
     * @param girType - The GIR type to map
     * @param isReturn - Whether this is a return type (affects pointer ownership)
     * @returns The TypeScript type string and FFI descriptor
     */
    mapType(girType: GirType, isReturn = false): TypeMapping {
        if (girType.isArray || girType.name === "array") {
            if (girType.elementType) {
                const elementType = this.mapType(girType.elementType);
                return {
                    ts: `${elementType.ts}[]`,
                    ffi: { type: "array", itemType: elementType.ffi },
                };
            }
            return {
                ts: `unknown[]`,
                ffi: { type: "array", itemType: { type: "undefined" } },
            };
        }

        const basicType = BASIC_TYPE_MAP.get(girType.name);
        if (basicType) {
            return basicType;
        }

        if (this.enumNames.has(girType.name)) {
            const transformedName = this.enumTransforms.get(girType.name) ?? girType.name;
            this.onEnumUsed?.(transformedName);
            return {
                ts: transformedName,
                ffi: { type: "int", size: 32, unsigned: false },
            };
        }

        if (girType.name.includes(".")) {
            const [_ns, typeName] = girType.name.split(".", 2);
            if (typeName && this.enumNames.has(typeName)) {
                const transformedName = this.enumTransforms.get(typeName) ?? typeName;
                this.onEnumUsed?.(transformedName);
                return {
                    ts: transformedName,
                    ffi: { type: "int", size: 32, unsigned: false },
                };
            }
            return {
                ts: "unknown",
                ffi: { type: "gobject", borrowed: isReturn },
            };
        }

        return {
            ts: "unknown",
            ffi: { type: "gobject", borrowed: isReturn },
        };
    }

    /**
     * Maps a GIR parameter to TypeScript and FFI type descriptors.
     * Handles out/inout parameters by wrapping in Ref type.
     * @param param - The GIR parameter to map
     * @returns The TypeScript type string and FFI descriptor
     */
    mapParameter(param: GirParameter): TypeMapping {
        if (param.direction === "out" || param.direction === "inout") {
            const innerType = this.mapType(param.type);
            return {
                ts: `Ref<${innerType.ts}>`,
                ffi: {
                    type: "ref",
                    innerType: innerType.ffi,
                },
            };
        }

        if (param.type.name === "GLib.Closure" || param.type.name.endsWith("Func")) {
            return {
                ts: "(...args: unknown[]) => unknown",
                ffi: { type: "callback" },
            };
        }

        return this.mapType(param.type);
    }

    /**
     * Checks if a parameter can accept null values.
     * @param param - The parameter to check
     * @returns True if the parameter is nullable or optional
     */
    isNullable(param: GirParameter): boolean {
        return param.nullable === true || param.optional === true;
    }

    /**
     * Gets the shared library name for a namespace.
     * @param namespace - The namespace name
     * @returns The shared library file name
     */
    getLibraryName(namespace: string): string {
        return LIBRARY_MAP[namespace] ?? `lib${namespace.toLowerCase()}.so`;
    }
}
