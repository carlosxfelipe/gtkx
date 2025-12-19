import { getApplication } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import { Box, Button, CheckButton, Entry, Expander, Frame, Label, Switch, ToggleButton } from "@gtkx/react";
import { afterEach, describe, expect, it } from "vitest";
import {
    cleanup,
    findAllByLabelText,
    findAllByRole,
    findAllByTestId,
    findAllByText,
    findByLabelText,
    findByRole,
    findByTestId,
    findByText,
    render,
} from "../src/index.js";

afterEach(async () => {
    await cleanup();
});

describe("findByRole", () => {
    it("finds element by accessible role", async () => {
        await render(<Button label="Test" />);
        const app = getApplication();
        const button = await findByRole(app, Gtk.AccessibleRole.BUTTON);
        expect(button).toBeDefined();
    });

    it("filters by name option", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Button label="Save" />
                <Button label="Cancel" />
            </Box>,
        );

        const app = getApplication();
        const saveButton = await findByRole(app, Gtk.AccessibleRole.BUTTON, { name: "Save" });
        expect(saveButton).toBeDefined();
    });

    it("filters by checked state for checkboxes", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <CheckButton.Root label="Unchecked" />
                <CheckButton.Root label="Checked" active />
            </Box>,
        );

        const app = getApplication();
        const checkedBox = await findByRole(app, Gtk.AccessibleRole.CHECKBOX, { checked: true });
        expect(checkedBox).toBeDefined();
    });

    it("filters by checked state for toggle buttons", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <ToggleButton.Root label="Inactive" />
                <ToggleButton.Root label="Active" active />
            </Box>,
        );

        const app = getApplication();
        const activeToggle = await findByRole(app, Gtk.AccessibleRole.TOGGLE_BUTTON, { checked: true });
        expect(activeToggle).toBeDefined();
    });

    it("filters by checked state for switches", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Switch />
                <Switch active />
            </Box>,
        );

        const app = getApplication();
        const activeSwitch = await findByRole(app, Gtk.AccessibleRole.SWITCH, { checked: true });
        expect(activeSwitch).toBeDefined();
    });

    it("finds expander by label", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Expander.Root label="Collapsed">
                    <Label label="Content" />
                </Expander.Root>
                <Expander.Root label="Expanded" expanded>
                    <Label label="Content" />
                </Expander.Root>
            </Box>,
        );

        const app = getApplication();
        const expandedButton = await findByRole(app, Gtk.AccessibleRole.BUTTON, { name: "Expanded" });
        expect(expandedButton).toBeDefined();
    });

    it("supports regex name matching", async () => {
        await render(<Button label="Submit Form" />);
        const app = getApplication();
        const button = await findByRole(app, Gtk.AccessibleRole.BUTTON, { name: /submit/i });
        expect(button).toBeDefined();
    });

    it("supports function matcher for name", async () => {
        await render(<Button label="Click Here" />);
        const app = getApplication();
        const button = await findByRole(app, Gtk.AccessibleRole.BUTTON, {
            name: (text) => text.includes("Click"),
        });
        expect(button).toBeDefined();
    });

    describe("error handling", () => {
        it("throws when element not found", async () => {
            await render(<Label label="Test" />);
            const app = getApplication();
            await expect(findByRole(app, Gtk.AccessibleRole.BUTTON, { timeout: 100 })).rejects.toThrow(
                "Unable to find any elements",
            );
        });

        it("throws when multiple elements found", async () => {
            await render(
                <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                    <Button label="First" />
                    <Button label="Second" />
                </Box>,
            );
            const app = getApplication();
            await expect(findByRole(app, Gtk.AccessibleRole.BUTTON, { timeout: 100 })).rejects.toThrow(
                "Found 2 elements",
            );
        });
    });
});

describe("findAllByRole", () => {
    it("finds all elements with matching role", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Button label="First" />
                <Button label="Second" />
                <Label label="Text" />
            </Box>,
        );

        const app = getApplication();
        const buttons = await findAllByRole(app, Gtk.AccessibleRole.BUTTON);
        expect(buttons.length).toBe(2);
    });

    describe("error handling", () => {
        it("throws when no elements found", async () => {
            await render(<Label label="Test" />);
            const app = getApplication();
            await expect(findAllByRole(app, Gtk.AccessibleRole.BUTTON, { timeout: 100 })).rejects.toThrow(
                "Unable to find any elements",
            );
        });
    });
});

describe("findByText", () => {
    it("finds element by exact text", async () => {
        await render(<Label label="Hello World" />);
        const app = getApplication();
        const label = await findByText(app, "Hello World");
        expect(label).toBeDefined();
    });

    it("finds element by partial text with exact false", async () => {
        await render(<Label label="Hello World" />);
        const app = getApplication();
        const label = await findByText(app, "Hello", { exact: false });
        expect(label).toBeDefined();
    });

    it("normalizes whitespace by default", async () => {
        await render(<Label label="  Hello   World  " />);
        const app = getApplication();
        const label = await findByText(app, "Hello World");
        expect(label).toBeDefined();
    });

    it("supports custom normalizer", async () => {
        await render(<Label label="HELLO WORLD" />);
        const app = getApplication();
        const label = await findByText(app, "hello world", {
            normalizer: (text) => text.toLowerCase(),
        });
        expect(label).toBeDefined();
    });

    describe("error handling", () => {
        it("throws when text not found", async () => {
            await render(<Label label="Test" />);
            const app = getApplication();
            await expect(findByText(app, "Nonexistent", { timeout: 100 })).rejects.toThrow(
                "Unable to find any elements",
            );
        });
    });
});

describe("findAllByText", () => {
    it("finds all elements with matching text", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Label label="Same" />
                <Label label="Same" />
                <Label label="Different" />
            </Box>,
        );

        const app = getApplication();
        const labels = await findAllByText(app, "Same");
        expect(labels.length).toBe(2);
    });
});

describe("findByLabelText", () => {
    it("finds button by label", async () => {
        await render(<Button label="Submit" />);
        const app = getApplication();
        const button = await findByLabelText(app, "Submit");
        expect(button).toBeDefined();
    });

    it("finds frame by label", async () => {
        await render(
            <Frame.Root label="Settings">
                <Label label="Content" />
            </Frame.Root>,
        );

        const app = getApplication();
        const frame = await findByRole(app, Gtk.AccessibleRole.GROUP, { name: "Settings" });
        expect(frame).toBeDefined();
    });
});

describe("findAllByLabelText", () => {
    it("finds all elements with matching label", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Button label="Action" />
                <Button label="Action" />
            </Box>,
        );

        const app = getApplication();
        const buttons = await findAllByLabelText(app, "Action");
        expect(buttons.length).toBe(2);
    });
});

describe("findByTestId", () => {
    it("finds element by widget name as test id", async () => {
        await render(<Entry name="email-input" />);
        const app = getApplication();
        const entry = await findByTestId(app, "email-input");
        expect(entry).toBeDefined();
    });

    it("supports regex matching", async () => {
        await render(<Entry name="form-field-email" />);
        const app = getApplication();
        const entry = await findByTestId(app, /form-field/);
        expect(entry).toBeDefined();
    });
});

describe("findAllByTestId", () => {
    it("finds all elements with matching test id", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Entry name="field" />
                <Entry name="field" />
            </Box>,
        );

        const app = getApplication();
        const entries = await findAllByTestId(app, "field");
        expect(entries.length).toBe(2);
    });
});
