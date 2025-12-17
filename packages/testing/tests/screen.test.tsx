import * as Gtk from "@gtkx/ffi/gtk";
import { Box, Button, Entry, Label } from "@gtkx/react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "../src/index.js";

afterEach(async () => {
    await cleanup();
});

describe("screen", () => {
    it("finds element by role", async () => {
        await render(<Button label="Test" />);
        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON);
        expect(button).toBeDefined();
    });

    it("finds element by text", async () => {
        await render(<Label label="Hello World" />);
        const label = await screen.findByText("Hello World");
        expect(label).toBeDefined();
    });

    it("finds element by label text", async () => {
        await render(<Button label="Click Me" />);
        const button = await screen.findByLabelText("Click Me");
        expect(button).toBeDefined();
    });

    it("finds element by test id", async () => {
        await render(<Entry name="my-input" />);
        const entry = await screen.findByTestId("my-input");
        expect(entry).toBeDefined();
    });

    it("finds all elements by role", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Button label="First" />
                <Button label="Second" />
                <Button label="Third" />
            </Box>,
        );

        const buttons = await screen.findAllByRole(Gtk.AccessibleRole.BUTTON);
        expect(buttons.length).toBe(3);
    });

    it("finds all elements by text", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Label label="Item" />
                <Label label="Item" />
            </Box>,
        );

        const labels = await screen.findAllByText("Item");
        expect(labels.length).toBe(2);
    });

    it("finds all elements by label text", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Button label="Action" />
                <Button label="Action" />
            </Box>,
        );

        const buttons = await screen.findAllByLabelText("Action");
        expect(buttons.length).toBe(2);
    });

    it("finds all elements by test id", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Entry name="field" />
                <Entry name="field" />
            </Box>,
        );

        const entries = await screen.findAllByTestId("field");
        expect(entries.length).toBe(2);
    });

    describe("error handling", () => {
        it("throws when no render has been performed", async () => {
            await cleanup();
            expect(() => screen.findByRole(Gtk.AccessibleRole.BUTTON, { timeout: 100 })).toThrow(
                "No render has been performed",
            );
        });
    });
});
