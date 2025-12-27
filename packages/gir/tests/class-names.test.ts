import { describe, expect, it } from "vitest";
import { CLASS_RENAMES, normalizeClassName } from "../src/index.js";

describe("CLASS_RENAMES", () => {
    it("maps Error to GError", () => {
        expect(CLASS_RENAMES.get("Error")).toBe("GError");
    });
});

describe("normalizeClassName", () => {
    it("converts snake_case to PascalCase", () => {
        expect(normalizeClassName("text_view")).toBe("TextView");
    });

    it("renames Error to GError", () => {
        expect(normalizeClassName("Error")).toBe("GError");
    });

    it("prefixes Object with GObject in GObject namespace", () => {
        expect(normalizeClassName("Object", "GObject")).toBe("GObject");
    });

    it("prefixes Object with namespace name in other namespaces", () => {
        expect(normalizeClassName("Object", "Pango")).toBe("PangoObject");
    });

    it("keeps regular class names unchanged after PascalCase conversion", () => {
        expect(normalizeClassName("Widget")).toBe("Widget");
        expect(normalizeClassName("Button")).toBe("Button");
    });
});
