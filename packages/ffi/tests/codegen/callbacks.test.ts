import { describe, expect, it, vi } from "vitest";
import * as Gtk from "../../src/generated/gtk/index.js";

describe("callbacks", () => {
    describe("signal callbacks", () => {
        it("accepts signal handler callback", () => {
            const button = new Gtk.Button();
            const handler = vi.fn();

            const handlerId = button.connect("clicked", handler);

            expect(typeof handlerId).toBe("number");
            expect(handlerId).toBeGreaterThan(0);
        });

        it("accepts handler with typed parameters", () => {
            const button = new Gtk.Button();
            const handler = vi.fn((_self: Gtk.Button) => {});

            button.connect("clicked", handler);

            expect(handler).not.toHaveBeenCalled();
        });

        it("accepts handler with after flag", () => {
            const button = new Gtk.Button();
            const handler = vi.fn();

            const handlerId = button.connect("clicked", handler, true);

            expect(handlerId).toBeGreaterThan(0);
        });
    });
});
