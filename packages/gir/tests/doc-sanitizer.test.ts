import { describe, expect, it } from "vitest";
import { formatDoc, formatMethodDoc, sanitizeDoc } from "../src/index.js";

describe("sanitizeDoc", () => {
    it("converts GIR links to TSDoc links", () => {
        const input = "See [class@Gtk.Widget] for more info.";
        const result = sanitizeDoc(input, { namespace: "Gtk" });
        expect(result).toContain("{@link");
    });

    it("converts kbd elements to inline code", () => {
        const input = "Press <kbd>Enter</kbd> to confirm.";
        const result = sanitizeDoc(input);
        expect(result).toBe("Press `Enter` to confirm.");
    });

    it("escapes @ annotations", () => {
        const input = "The @self parameter is required.";
        const result = sanitizeDoc(input);
        expect(result).toBe("The `self` parameter is required.");
    });

    it("cleans up whitespace", () => {
        const input = "Hello\n\n\n\nWorld";
        const result = sanitizeDoc(input);
        expect(result).toBe("Hello\n\nWorld");
    });
});

describe("formatDoc", () => {
    it("returns empty string for undefined doc", () => {
        expect(formatDoc(undefined)).toBe("");
    });

    it("returns empty string for empty doc", () => {
        expect(formatDoc("")).toBe("");
    });

    it("formats single-line doc correctly", () => {
        const result = formatDoc("Short description.", "");
        expect(result).toContain("/**");
        expect(result).toContain("*/");
    });

    it("formats multi-line doc correctly", () => {
        const result = formatDoc("First line.\nSecond line.", "");
        expect(result).toContain("/**");
        expect(result).toContain(" * First line.");
        expect(result).toContain(" * Second line.");
        expect(result).toContain(" */");
    });
});

describe("formatMethodDoc", () => {
    it("returns empty string when no documentation", () => {
        const result = formatMethodDoc(undefined, []);
        expect(result).toBe("");
    });

    it("includes method description", () => {
        const result = formatMethodDoc("Method description.", []);
        expect(result).toContain("Method description.");
    });

    it("includes param documentation", () => {
        const result = formatMethodDoc("Method description.", [{ name: "value", doc: "The value to set." }]);
        expect(result).toContain("@param value");
        expect(result).toContain("The value to set.");
    });

    it("skips params without doc", () => {
        const result = formatMethodDoc("Method description.", [{ name: "value", doc: undefined }]);
        expect(result).not.toContain("@param value");
    });
});
