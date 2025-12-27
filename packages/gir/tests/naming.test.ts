import { describe, expect, it } from "vitest";
import { toCamelCase, toPascalCase, toKebabCase, toConstantCase, toValidIdentifier, RESERVED_WORDS } from "../src/index.js";

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

describe("toKebabCase", () => {
    it("converts camelCase to kebab-case", () => {
        expect(toKebabCase("helloWorld")).toBe("hello-world");
    });

    it("converts PascalCase to kebab-case", () => {
        expect(toKebabCase("HelloWorld")).toBe("hello-world");
    });

    it("converts underscores to hyphens", () => {
        expect(toKebabCase("hello_world")).toBe("hello-world");
    });
});

describe("toConstantCase", () => {
    it("converts kebab-case to CONSTANT_CASE", () => {
        expect(toConstantCase("hello-world")).toBe("HELLO_WORLD");
    });

    it("converts to uppercase", () => {
        expect(toConstantCase("HELLO-world")).toBe("HELLO_WORLD");
    });
});

describe("toValidIdentifier", () => {
    it("replaces invalid characters with underscore", () => {
        expect(toValidIdentifier("hello.world")).toBe("hello_world");
    });

    it("prefixes reserved words with underscore", () => {
        expect(toValidIdentifier("class")).toBe("_class");
        expect(toValidIdentifier("function")).toBe("_function");
    });

    it("prefixes identifiers starting with digit", () => {
        expect(toValidIdentifier("3d")).toBe("_3d");
    });

    it("keeps valid identifiers unchanged", () => {
        expect(toValidIdentifier("validName")).toBe("validName");
    });
});

describe("RESERVED_WORDS", () => {
    it("contains JavaScript reserved words", () => {
        expect(RESERVED_WORDS.has("class")).toBe(true);
        expect(RESERVED_WORDS.has("function")).toBe(true);
        expect(RESERVED_WORDS.has("const")).toBe(true);
        expect(RESERVED_WORDS.has("let")).toBe(true);
        expect(RESERVED_WORDS.has("async")).toBe(true);
        expect(RESERVED_WORDS.has("await")).toBe(true);
    });

    it("does not contain non-reserved words", () => {
        expect(RESERVED_WORDS.has("widget")).toBe(false);
        expect(RESERVED_WORDS.has("button")).toBe(false);
    });
});
