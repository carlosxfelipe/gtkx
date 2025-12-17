import * as Gtk from "@gtkx/ffi/gtk";
import type React from "react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Box, Button, Entry, Image, Label } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

describe("render - widget creation", () => {
    describe("basic widgets", () => {
        it("creates Label widget with text", async () => {
            const ref = createRef<Gtk.Label>();

            render(<Label ref={ref} label="Hello World" />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getLabel()).toBe("Hello World");
        });

        it("creates Button widget with label", async () => {
            const ref = createRef<Gtk.Button>();

            render(<Button ref={ref} label="Click Me" />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getLabel()).toBe("Click Me");
        });

        it("creates Box widget with orientation", async () => {
            const ref = createRef<Gtk.Box>();

            render(<Box ref={ref} spacing={0} orientation={Gtk.Orientation.VERTICAL} />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getOrientation()).toBe(Gtk.Orientation.VERTICAL);
        });

        it("creates Entry widget", async () => {
            const ref = createRef<Gtk.Entry>();

            render(<Entry ref={ref} placeholderText="Enter text" />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getPlaceholderText()).toBe("Enter text");
        });

        it("creates Image widget", async () => {
            const ref = createRef<Gtk.Image>();

            render(<Image ref={ref} iconName="dialog-information" />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getIconName()).toBe("dialog-information");
        });
    });

    describe("constructor parameters", () => {
        it("passes constructor parameters from props", async () => {
            const ref = createRef<Gtk.Box>();

            render(<Box ref={ref} orientation={Gtk.Orientation.HORIZONTAL} spacing={10} />);
            await flushMicrotasks();

            expect(ref.current?.getSpacing()).toBe(10);
        });

        it("handles widgets with no constructor parameters", async () => {
            const ref = createRef<Gtk.Button>();

            render(<Button ref={ref} />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
        });

        it("handles widgets with optional constructor parameters", async () => {
            const ref = createRef<Gtk.Label>();

            render(<Label ref={ref} />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
        });
    });

    describe("widget resolution", () => {
        it("throws error for unknown widget type", async () => {
            const UnknownWidget = "UnknownWidget123" as unknown as React.FC;

            const errorPromise = new Promise<Error>((resolve) => {
                const handler = (error: Error) => {
                    process.off("uncaughtException", handler);
                    resolve(error);
                };
                process.on("uncaughtException", handler);
            });

            render(<UnknownWidget />);

            const error = await errorPromise;
            expect(error.message).toContain("Unknown GTK widget type");
        });
    });

    describe("ref access", () => {
        it("provides GTK widget via ref", async () => {
            const ref = createRef<Gtk.Label>();

            render(<Label ref={ref} label="Test" />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
            expect(typeof ref.current?.getLabel).toBe("function");
        });

        it("ref.current is the actual GTK widget instance", async () => {
            const ref = createRef<Gtk.Label>();

            render(<Label ref={ref} label="Widget Instance" />);
            await flushMicrotasks();

            expect(ref.current?.id).toBeDefined();
            expect(ref.current?.getLabel()).toBe("Widget Instance");
        });
    });
});
