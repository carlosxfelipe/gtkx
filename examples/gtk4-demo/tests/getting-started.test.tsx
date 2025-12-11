import { AccessibleRole } from "@gtkx/ffi/gtk";
import { cleanup, render, screen, userEvent } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { helloWorldDemo } from "../src/demos/getting-started/hello-world.js";

describe("Getting Started Demos", () => {
    afterEach(async () => {
        await cleanup();
    });

    describe("hello world demo", () => {
        const HelloWorldDemo = helloWorldDemo.component;

        it("renders initial greeting", async () => {
            await render(<HelloWorldDemo />);

            const greeting = await screen.findByText("Hello, World!");
            expect(greeting).toBeDefined();
        });

        it("has say hello button", async () => {
            await render(<HelloWorldDemo />);

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Say Hello" });
            expect(button).toBeDefined();
        });

        it("changes greeting when button is clicked", async () => {
            await render(<HelloWorldDemo />);

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Say Hello" });
            await userEvent.click(button);

            const newGreeting = await screen.findByText("Hello from GTKX!");
            expect(newGreeting).toBeDefined();
        });

        it("greeting no longer shows original text after click", async () => {
            await render(<HelloWorldDemo />);

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Say Hello" });
            await userEvent.click(button);

            await expect(screen.findByText("Hello, World!", { timeout: 100 })).rejects.toThrow();
        });
    });
});
