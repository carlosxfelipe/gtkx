import { AccessibleRole } from "@gtkx/ffi/gtk";
import { cleanup, render, screen, userEvent } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { progressBarDemo } from "../src/demos/display/progress-bar.js";
import { spinnerDemo } from "../src/demos/display/spinner.js";

describe("Display Demos", () => {
    afterEach(async () => {
        await cleanup();
    });

    describe("spinner demo", () => {
        const SpinnerDemo = spinnerDemo.component;

        it("renders spinner title", async () => {
            await render(<SpinnerDemo />);

            const title = await screen.findByText("Spinner");
            expect(title).toBeDefined();
        });

        it("renders multiple spinners with different sizes", async () => {
            await render(<SpinnerDemo />);

            const sizeLabels = ["16px", "32px", "48px", "64px"];
            for (const size of sizeLabels) {
                const label = await screen.findByText(size);
                expect(label).toBeDefined();
            }
        });

        it("has start/stop button", async () => {
            await render(<SpinnerDemo />);

            const stopButton = await screen.findByRole(AccessibleRole.BUTTON, { name: "Stop" });
            expect(stopButton).toBeDefined();
        });

        it("toggles spinner on button click", async () => {
            await render(<SpinnerDemo />);

            const stopButton = await screen.findByRole(AccessibleRole.BUTTON, { name: "Stop" });
            await userEvent.click(stopButton);

            const startButton = await screen.findByRole(AccessibleRole.BUTTON, { name: "Start" });
            expect(startButton).toBeDefined();
        });

        it("can restart spinner after stopping", async () => {
            await render(<SpinnerDemo />);

            const stopButton = await screen.findByRole(AccessibleRole.BUTTON, { name: "Stop" });
            await userEvent.click(stopButton);

            const startButton = await screen.findByRole(AccessibleRole.BUTTON, { name: "Start" });
            await userEvent.click(startButton);

            const stopButtonAgain = await screen.findByRole(AccessibleRole.BUTTON, { name: "Stop" });
            expect(stopButtonAgain).toBeDefined();
        });
    });

    describe("progress bar demo", () => {
        const ProgressBarDemo = progressBarDemo.component;

        it("renders progress bar title", async () => {
            await render(<ProgressBarDemo />);

            const title = await screen.findByText("Progress Bar");
            expect(title).toBeDefined();
        });

        it("shows initial progress at 0%", async () => {
            await render(<ProgressBarDemo />);

            const progressText = await screen.findByText("0%");
            expect(progressText).toBeDefined();
        });

        it("has start button", async () => {
            await render(<ProgressBarDemo />);

            const startButton = await screen.findByRole(AccessibleRole.BUTTON, { name: "Start" });
            expect(startButton).toBeDefined();
        });

        it("has reset button", async () => {
            await render(<ProgressBarDemo />);

            const resetButton = await screen.findByRole(AccessibleRole.BUTTON, { name: "Reset" });
            expect(resetButton).toBeDefined();
        });

        it("shows static progress level examples", async () => {
            await render(<ProgressBarDemo />);

            const labels = ["25%", "50%", "75%", "100%"];
            for (const label of labels) {
                const progressLabel = await screen.findByText(label);
                expect(progressLabel).toBeDefined();
            }
        });

        it("renders With Text section", async () => {
            await render(<ProgressBarDemo />);

            const withTextLabel = await screen.findByText("With Text");
            expect(withTextLabel).toBeDefined();
        });

        it("disables start button while running", async () => {
            await render(<ProgressBarDemo />);

            const startButton = await screen.findByRole(AccessibleRole.BUTTON, { name: "Start" });
            await userEvent.click(startButton);

            const runningButton = await screen.findByRole(AccessibleRole.BUTTON, { name: "Running..." });
            expect(runningButton.getSensitive()).toBe(false);
        });
    });
});
