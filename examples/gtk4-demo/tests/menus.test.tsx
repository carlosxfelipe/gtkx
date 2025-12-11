import { AccessibleRole } from "@gtkx/ffi/gtk";
import { cleanup, render, screen } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { popoverDemo } from "../src/demos/menus/popover.js";

describe("Menus Demos", () => {
    afterEach(async () => {
        await cleanup();
    });

    describe("popover demo", () => {
        const PopoverDemo = popoverDemo.component;

        it("renders popover title", async () => {
            await render(<PopoverDemo />);

            const title = await screen.findByText("Popover");
            expect(title).toBeDefined();
        });

        it("renders description about Popover", async () => {
            await render(<PopoverDemo />);

            const description = await screen.findByText(/GtkPopover is a bubble-like context popup/);
            expect(description).toBeDefined();
        });

        it("renders menu button with popover", async () => {
            await render(<PopoverDemo />);

            const menuButton = await screen.findByRole(AccessibleRole.BUTTON, { name: "Open Popover" });
            expect(menuButton).toBeDefined();
        });

        it("renders actions menu section", async () => {
            await render(<PopoverDemo />);

            const actionsHeading = await screen.findByText("Actions Menu");
            expect(actionsHeading).toBeDefined();
        });

        it("renders section headings", async () => {
            await render(<PopoverDemo />);

            const aboutHeading = await screen.findByText("About Popover");
            const menuHeading = await screen.findByText("Menu Button with Popover");
            const actionsHeading = await screen.findByText("Actions Menu");
            const featuresHeading = await screen.findByText("Features");

            expect(aboutHeading).toBeDefined();
            expect(menuHeading).toBeDefined();
            expect(actionsHeading).toBeDefined();
            expect(featuresHeading).toBeDefined();
        });

        it("describes popover features", async () => {
            await render(<PopoverDemo />);

            const features = await screen.findByText(/Popovers support custom positioning/);
            expect(features).toBeDefined();
        });
    });
});
