import { describe, expect, it } from "vitest";
import * as Gtk from "../src/generated/gtk/index.js";
import { getApplication } from "../src/index.js";

describe("getApplication", () => {
    it("returns the running GTK Application", () => {
        const app = getApplication();
        expect(app).toBeDefined();
        expect(app).toBeInstanceOf(Gtk.Application);
    });
});
