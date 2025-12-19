import { getApplication } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import { ApplicationWindow, Box, Button, Label } from "@gtkx/react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "../src/index.js";

afterEach(async () => {
    await cleanup();
});

describe("render", () => {
    it("renders a simple element", async () => {
        const { findByRole } = await render(<Button label="Click me" />);
        const button = await findByRole(Gtk.AccessibleRole.BUTTON);
        expect(button).toBeDefined();
    });

    it("renders nested elements", async () => {
        const { findByRole, findByText } = await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Button label="First" />
                <Label label="Second" />
            </Box>,
        );

        const button = await findByRole(Gtk.AccessibleRole.BUTTON);
        const label = await findByText("Second");

        expect(button).toBeDefined();
        expect(label).toBeDefined();
    });

    it("returns container as the GTK Application", async () => {
        const { container } = await render(<Label label="Test" />);
        expect(container).toBeDefined();
        expect(container.getApplicationId()).toMatch(/com\.gtkx\.test/);
    });

    it("wraps element in ApplicationWindow by default", async () => {
        const { findByRole } = await render(<Button label="Test" />);
        const window = await findByRole(Gtk.AccessibleRole.WINDOW);
        expect(window).toBeDefined();
    });

    it("does not wrap when wrapper is false", async () => {
        const { findByRole } = await render(
            <ApplicationWindow>
                <Button label="Test" />
            </ApplicationWindow>,
            { wrapper: false },
        );

        const windows = await findByRole(Gtk.AccessibleRole.WINDOW);
        expect(windows).toBeDefined();
    });

    it("uses custom wrapper component", async () => {
        const CustomWrapper = ({ children }: { children: React.ReactNode }) => (
            <ApplicationWindow title="Custom Title">{children}</ApplicationWindow>
        );

        const { findByRole } = await render(<Button label="Test" />, { wrapper: CustomWrapper });
        const window = await findByRole(Gtk.AccessibleRole.WINDOW, { name: "Custom Title" });
        expect(window).toBeDefined();
    });

    it("provides rerender function to update content", async () => {
        const { findByText, rerender } = await render(<Label label="Initial" />);

        await findByText("Initial");
        await rerender(<Label label="Updated" />);

        const updatedLabel = await findByText("Updated");
        expect(updatedLabel).toBeDefined();
    });

    it("provides unmount function to remove content", async () => {
        const { findByRole, unmount } = await render(<Button label="Test" />);

        await findByRole(Gtk.AccessibleRole.BUTTON);
        await unmount();

        const app = getApplication();
        const activeWindow = app.getActiveWindow();
        expect(activeWindow).toBeNull();
    });

    it("provides debug function", async () => {
        const { debug } = await render(<Button label="Debug Test" />);
        expect(typeof debug).toBe("function");
    });
});

describe("cleanup", () => {
    it("removes rendered content", async () => {
        await render(<Button label="Test" />);
        await cleanup();

        const app = getApplication();
        const windows = app.getWindows();
        expect(windows.length).toBe(0);
    });

    it("allows rendering again after cleanup", async () => {
        const { findByText } = await render(<Label label="First" />);
        await findByText("First");

        await cleanup();

        const { findByText: findByText2 } = await render(<Label label="Second" />);
        const label = await findByText2("Second");
        expect(label).toBeDefined();
    });
});
