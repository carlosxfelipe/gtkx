import { describe, expect, it } from "vitest";
import { namespaceDirectory } from "../../src/gir/namespace.js";
import { setClassStructs } from "../../src/store/gi/class-struct-record.js";
import { generateNamespaceModule } from "../../src/store/gi/pipeline.js";
import { library } from "../helpers/library.js";

const namespaceSource = (name: string): string => {
    const namespace = library.namespaces.values().find((entry) => namespaceDirectory(entry) === name);

    if (namespace === undefined) {
        throw new Error(`namespace ${name} was not loaded`);
    }

    return generateNamespaceModule(namespace, library);
};

describe("class struct records", () => {
    it("skips the class structs GIR leaves unannotated", () => {
        const gobject = namespaceSource("gobject");
        expect(gobject).not.toMatch(/^export class TypeClass\b/m);
        expect(gobject).not.toMatch(/^export class TypeInterface\b/m);
        expect(gobject).not.toMatch(/^export class EnumClass\b/m);
    });

    it("skips the vtables GIR does annotate", () => {
        expect(namespaceSource("gtk")).not.toMatch(/^export class WidgetClass\b/m);
    });

    it("emits an ordinary record", () => {
        expect(namespaceSource("gtk")).toMatch(/^export class Border\b/m);
    });

    it("skips a record the project declares a class struct", () => {
        setClassStructs(["Gtk.Border"]);
        expect(namespaceSource("gtk")).not.toMatch(/^export class Border\b/m);
        setClassStructs([]);
        expect(namespaceSource("gtk")).toMatch(/^export class Border\b/m);
    });
});
