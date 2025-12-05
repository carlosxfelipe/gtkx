import { cleanup, render, screen } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/app.js";

const renderApp = () => render(<App />, { wrapper: ({ children }) => <>{children}</> });

describe("List Example", () => {
    afterEach(async () => {
        await cleanup();
    });

    it("renders the application with Notebook and ListView content", async () => {
        await renderApp();

        const titles = await screen.findAllByText("ListView - Task List");
        expect(titles.length).toBeGreaterThan(0);
    });
});
