import * as Gtk from "@gtkx/ffi/gtk";
import { Box, Button, Entry, Frame, Label } from "@gtkx/react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "../src/index.js";

afterEach(async () => {
    await cleanup();
});

describe("within", () => {
    it("scopes queries to container element", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Frame.Root name="section-a" label="Section A">
                    <Button label="Submit" />
                </Frame.Root>
                <Frame.Root name="section-b" label="Section B">
                    <Button label="Cancel" />
                </Frame.Root>
            </Box>,
        );

        const sectionA = await screen.findByTestId("section-a");
        const { findByRole } = within(sectionA);

        const submitButton = await findByRole(Gtk.AccessibleRole.BUTTON);
        expect(submitButton).toBeDefined();
    });

    it("does not find elements outside container", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Frame.Root name="inner-frame" label="Inner">
                    <Label label="Inside" />
                </Frame.Root>
                <Label label="Outside" />
            </Box>,
        );

        const frame = await screen.findByTestId("inner-frame");
        const { findByText } = within(frame);

        await expect(findByText("Outside", { timeout: 100 })).rejects.toThrow("Unable to find");
    });

    it("provides findByRole query", async () => {
        await render(
            <Frame.Root name="container">
                <Button label="Test" />
            </Frame.Root>,
        );

        const frame = await screen.findByTestId("container");
        const { findByRole } = within(frame);
        const button = await findByRole(Gtk.AccessibleRole.BUTTON);
        expect(button).toBeDefined();
    });

    it("provides findByText query", async () => {
        await render(
            <Frame.Root name="container">
                <Label label="Hello World" />
            </Frame.Root>,
        );

        const frame = await screen.findByTestId("container");
        const { findByText } = within(frame);
        const label = await findByText("Hello World");
        expect(label).toBeDefined();
    });

    it("provides findByLabelText query", async () => {
        await render(
            <Frame.Root name="container">
                <Button label="Action" />
            </Frame.Root>,
        );

        const frame = await screen.findByTestId("container");
        const { findByLabelText } = within(frame);
        const button = await findByLabelText("Action");
        expect(button).toBeDefined();
    });

    it("provides findByTestId query", async () => {
        await render(
            <Frame.Root name="container">
                <Entry name="my-input" />
            </Frame.Root>,
        );

        const frame = await screen.findByTestId("container");
        const { findByTestId } = within(frame);
        const entry = await findByTestId("my-input");
        expect(entry).toBeDefined();
    });

    it("provides findAllByRole query", async () => {
        await render(
            <Frame.Root name="container">
                <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                    <Button label="First" />
                    <Button label="Second" />
                </Box>
            </Frame.Root>,
        );

        const frame = await screen.findByTestId("container");
        const { findAllByRole } = within(frame);
        const buttons = await findAllByRole(Gtk.AccessibleRole.BUTTON);
        expect(buttons.length).toBe(2);
    });

    it("provides findAllByText query", async () => {
        await render(
            <Frame.Root name="container">
                <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                    <Label label="Item" />
                    <Label label="Item" />
                </Box>
            </Frame.Root>,
        );

        const frame = await screen.findByTestId("container");
        const { findAllByText } = within(frame);
        const labels = await findAllByText("Item");
        expect(labels.length).toBe(2);
    });

    it("provides findAllByLabelText query", async () => {
        await render(
            <Frame.Root name="container">
                <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                    <Button label="Action" />
                    <Button label="Action" />
                </Box>
            </Frame.Root>,
        );

        const frame = await screen.findByTestId("container");
        const { findAllByLabelText } = within(frame);
        const buttons = await findAllByLabelText("Action");
        expect(buttons.length).toBe(2);
    });

    it("provides findAllByTestId query", async () => {
        await render(
            <Frame.Root name="container">
                <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                    <Entry name="field" />
                    <Entry name="field" />
                </Box>
            </Frame.Root>,
        );

        const frame = await screen.findByTestId("container");
        const { findAllByTestId } = within(frame);
        const entries = await findAllByTestId("field");
        expect(entries.length).toBe(2);
    });

    it("supports nested within calls", async () => {
        await render(
            <Frame.Root name="outer-frame">
                <Frame.Root name="inner-frame">
                    <Button label="Deep" />
                </Frame.Root>
            </Frame.Root>,
        );

        const outer = await screen.findByTestId("outer-frame");
        const { findByTestId: findInOuter } = within(outer);
        const inner = await findInOuter("inner-frame");
        const { findByRole } = within(inner);
        const button = await findByRole(Gtk.AccessibleRole.BUTTON);
        expect(button).toBeDefined();
    });
});
