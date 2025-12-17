import { describe, expect, it } from "vitest";
import type { GirClass, GirNamespace } from "../src/index.js";
import { buildClassMap, registerEnumsFromNamespace, TypeMapper, toCamelCase, toPascalCase } from "../src/index.js";

describe("toCamelCase", () => {
    it("converts snake_case to camelCase", () => {
        expect(toCamelCase("hello_world")).toBe("helloWorld");
    });

    it("converts kebab-case to camelCase", () => {
        expect(toCamelCase("hello-world")).toBe("helloWorld");
    });

    it("handles multiple underscores", () => {
        expect(toCamelCase("get_text_buffer")).toBe("getTextBuffer");
    });

    it("handles multiple hyphens", () => {
        expect(toCamelCase("get-text-buffer")).toBe("getTextBuffer");
    });

    it("only converts lowercase letters after separators", () => {
        expect(toCamelCase("set_css_classes")).toBe("setCssClasses");
    });

    it("returns single word unchanged", () => {
        expect(toCamelCase("widget")).toBe("widget");
    });

    it("handles empty string", () => {
        expect(toCamelCase("")).toBe("");
    });

    it("handles string starting with separator", () => {
        expect(toCamelCase("_private")).toBe("Private");
    });
});

describe("toPascalCase", () => {
    it("converts snake_case to PascalCase", () => {
        expect(toPascalCase("hello_world")).toBe("HelloWorld");
    });

    it("converts kebab-case to PascalCase", () => {
        expect(toPascalCase("hello-world")).toBe("HelloWorld");
    });

    it("handles multiple underscores", () => {
        expect(toPascalCase("get_text_buffer")).toBe("GetTextBuffer");
    });

    it("handles single word", () => {
        expect(toPascalCase("widget")).toBe("Widget");
    });

    it("handles already PascalCase string", () => {
        expect(toPascalCase("Widget")).toBe("Widget");
    });

    it("handles empty string", () => {
        expect(toPascalCase("")).toBe("");
    });

    it("handles string starting with underscore", () => {
        expect(toPascalCase("_private_field")).toBe("PrivateField");
    });
});

describe("buildClassMap", () => {
    it("builds map from class array", () => {
        const classes: GirClass[] = [
            {
                name: "Widget",
                cType: "GtkWidget",
                implements: [],
                methods: [],
                constructors: [],
                functions: [],
                properties: [],
                signals: [],
            },
            {
                name: "Button",
                cType: "GtkButton",
                implements: [],
                methods: [],
                constructors: [],
                functions: [],
                properties: [],
                signals: [],
            },
        ];

        const map = buildClassMap(classes);

        expect(map.size).toBe(2);
        expect(map.get("Widget")).toBe(classes[0]);
        expect(map.get("Button")).toBe(classes[1]);
    });

    it("handles empty array", () => {
        const map = buildClassMap([]);

        expect(map.size).toBe(0);
    });

    it("allows lookup by class name", () => {
        const classes: GirClass[] = [
            {
                name: "Container",
                cType: "GtkContainer",
                parent: "Widget",
                implements: [],
                methods: [],
                constructors: [],
                functions: [],
                properties: [],
                signals: [],
            },
        ];

        const map = buildClassMap(classes);
        const container = map.get("Container");

        expect(container).toBeDefined();
        expect(container?.parent).toBe("Widget");
    });
});

describe("registerEnumsFromNamespace", () => {
    it("registers enumerations from namespace", () => {
        const typeMapper = new TypeMapper();
        const namespace: GirNamespace = {
            name: "Gtk",
            version: "4.0",
            sharedLibrary: "",
            cPrefix: "",
            classes: [],
            interfaces: [],
            functions: [],
            enumerations: [
                { name: "Orientation", cType: "GtkOrientation", members: [] },
                { name: "text_direction", cType: "GtkTextDirection", members: [] },
            ],
            bitfields: [],
            records: [],
            callbacks: [],
            constants: [],
        };

        registerEnumsFromNamespace(typeMapper, namespace);

        const orientationResult = typeMapper.mapType({ name: "Orientation" });
        expect(orientationResult.ts).toBe("Orientation");
        expect(orientationResult.ffi.type).toBe("int");

        const directionResult = typeMapper.mapType({ name: "text_direction" });
        expect(directionResult.ts).toBe("TextDirection");
    });

    it("registers bitfields from namespace", () => {
        const typeMapper = new TypeMapper();
        const namespace: GirNamespace = {
            name: "Gtk",
            version: "4.0",
            sharedLibrary: "",
            cPrefix: "",
            classes: [],
            interfaces: [],
            functions: [],
            enumerations: [],
            bitfields: [
                { name: "StateFlags", cType: "GtkStateFlags", members: [] },
                { name: "input_hints", cType: "GtkInputHints", members: [] },
            ],
            records: [],
            callbacks: [],
            constants: [],
        };

        registerEnumsFromNamespace(typeMapper, namespace);

        const stateFlagsResult = typeMapper.mapType({ name: "StateFlags" });
        expect(stateFlagsResult.ts).toBe("StateFlags");

        const inputHintsResult = typeMapper.mapType({ name: "input_hints" });
        expect(inputHintsResult.ts).toBe("InputHints");
    });

    it("handles namespace with both enums and bitfields", () => {
        const typeMapper = new TypeMapper();
        const namespace: GirNamespace = {
            name: "Gdk",
            version: "4.0",
            sharedLibrary: "",
            cPrefix: "",
            classes: [],
            interfaces: [],
            functions: [],
            enumerations: [{ name: "CrossingMode", cType: "GdkCrossingMode", members: [] }],
            bitfields: [{ name: "ModifierType", cType: "GdkModifierType", members: [] }],
            records: [],
            callbacks: [],
            constants: [],
        };

        registerEnumsFromNamespace(typeMapper, namespace);

        expect(typeMapper.mapType({ name: "CrossingMode" }).ts).toBe("CrossingMode");
        expect(typeMapper.mapType({ name: "ModifierType" }).ts).toBe("ModifierType");
    });

    it("handles empty namespace without errors", () => {
        const typeMapper = new TypeMapper();
        const namespace: GirNamespace = {
            name: "Empty",
            version: "1.0",
            sharedLibrary: "",
            cPrefix: "",
            classes: [],
            interfaces: [],
            functions: [],
            enumerations: [],
            bitfields: [],
            records: [],
            callbacks: [],
            constants: [],
        };

        expect(() => registerEnumsFromNamespace(typeMapper, namespace)).not.toThrow();
    });
});
