import type { GirFunction } from "../../gir/function.js";
import type { GirRecord } from "../../gir/record.js";
import type { TypeId } from "../../gir/type-id.js";
import type { ModuleContext } from "../../writer/context.js";

/**
 * The class and interface structs GIR does not annotate. Every other vtable carries
 * `glib:is-gtype-struct-for`, which the parser records as `GirRecord.isVtable`; these seven are
 * unannotated because they are the roots the annotation is defined against, or because their library
 * predates it. Qualified GIR names, extended by `classStructs` in `gtkx.config.ts`.
 */
const BUILTIN_CLASS_STRUCTS: string[] = [
    "GObject.EnumClass",
    "GObject.FlagsClass",
    "GObject.TypeClass",
    "GObject.TypeInterface",
    "GObject.TypePluginClass",
    "Gtk.EditableClass",
    "Pango.AttrClass",
];

const classStructs: Set<string> = new Set(BUILTIN_CLASS_STRUCTS);

/** Installs the project's extra class structs on top of the built-in set; set once per run. */
const setClassStructs = (names: string[]): void => {
    classStructs.clear();

    for (const name of [...BUILTIN_CLASS_STRUCTS, ...names]) {
        classStructs.add(name);
    }
};

const isClassStructRecord = (namespaceName: string, record: GirRecord): boolean =>
    record.isVtable || classStructs.has(`${namespaceName}.${record.name}`);

const isClassStructRef = (context: ModuleContext, ref: TypeId | undefined): boolean => {
    if (ref === undefined) {
        return false;
    }

    const type = context.library.typeFor(ref);

    if (type === undefined) {
        return false;
    }

    switch (type.kind) {
        case "record": {
            return isClassStructRecord(type.namespace.name, type.value);
        }
        case "carray":
        case "list": {
            return isClassStructRef(context, type.element);
        }
        case "alias":
        case "callback":
        case "class":
        case "enum":
        case "hashtable":
        case "interface":
        case "primitive":
        case "varargs": {
            return false;
        }
    }
};

const hasClassStructReference = (context: ModuleContext, fn: GirFunction): boolean =>
    isClassStructRef(context, fn.returnValue.type) ||
    fn.parameters.some((parameter) => isClassStructRef(context, parameter.type));

export { setClassStructs, isClassStructRecord, isClassStructRef, hasClassStructReference };
