import * as Gtk from "@gtkx/ffi/gtk";
import { cleanup, fireEvent, render, screen, userEvent, waitFor } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/app.js";

const TestApp = () => <App onClose={() => {}} />;

const addTodo = async (input: Gtk.Widget, addButton: Gtk.Widget, text: string) => {
    await userEvent.type(input, text);
    await userEvent.click(addButton);
    await waitFor(() => {
        expect((input as Gtk.Entry).getText()).toBe("");
    });
};

describe("Todo App", () => {
    afterEach(async () => {
        await cleanup();
    });

    describe("adding todos", () => {
        it("adds a new todo when clicking Add button", async () => {
            await render(<TestApp />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");
            await addTodo(input, addButton, "Buy groceries");

            const todoText = await screen.findAllByText("Buy groceries");
            expect(todoText.length).toBeGreaterThan(0);
        });

        it("adds a new todo when pressing Enter", async () => {
            await render(<TestApp />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            await userEvent.type(input, "Walk the dog");
            await fireEvent(input, "activate");

            const todoText = await await screen.findAllByText("Walk the dog");
            expect(todoText.length).toBeGreaterThan(0);
        });

        it("clears input after adding todo", async () => {
            await render(<TestApp />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");
            await addTodo(input, addButton, "Buy groceries");

            expect((input as Gtk.Entry).getText()).toBe("");
        });

        it("does not add empty todos", async () => {
            await render(<TestApp />, { wrapper: false });

            const addButton = await screen.findByTestId("add-button");
            expect((addButton as Gtk.Button).getSensitive()).toBe(false);
        });
    });

    describe("completing todos", () => {
        it("can toggle a todo as completed", async () => {
            await render(<TestApp />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");
            await addTodo(input, addButton, "Test todo");

            const checkbox = await screen.findByRole(Gtk.AccessibleRole.CHECKBOX);
            expect((checkbox as Gtk.CheckButton).getActive()).toBe(false);

            await userEvent.click(checkbox);
            await waitFor(() => {
                expect((checkbox as Gtk.CheckButton).getActive()).toBe(true);
            });
        });

        it("can toggle a completed todo back to active", async () => {
            await render(<TestApp />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");
            await addTodo(input, addButton, "Test todo");

            const checkbox = await screen.findByRole(Gtk.AccessibleRole.CHECKBOX);
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect((checkbox as Gtk.CheckButton).getActive()).toBe(true);
            });

            await userEvent.click(checkbox);
            await waitFor(() => {
                expect((checkbox as Gtk.CheckButton).getActive()).toBe(false);
            });
        });
    });

    describe("deleting todos", () => {
        it("can delete a todo", async () => {
            await render(<TestApp />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");
            await addTodo(input, addButton, "Todo to delete");

            const deleteButton = await screen.findByTestId(/^delete-/);
            await userEvent.click(deleteButton);

            const emptyMessage = await screen.findByText("No tasks yet");
            expect(emptyMessage).toBeDefined();
        });
    });

    describe("filtering todos", () => {
        it("shows filter bar when todos exist", async () => {
            await render(<TestApp />, { wrapper: false });

            await expect(screen.findByTestId("filter-all", { timeout: 100 })).rejects.toThrow();

            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");
            await addTodo(input, addButton, "Test todo");

            const filterAll = await screen.findByTestId("filter-all");
            expect(filterAll).toBeDefined();
        });

        it("filters to show only active todos", async () => {
            await render(<TestApp />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");
            await addTodo(input, addButton, "Active todo");
            await addTodo(input, addButton, "Completed todo");

            const checkboxes = await screen.findAllByRole(Gtk.AccessibleRole.CHECKBOX);
            await userEvent.click(checkboxes[1] as Gtk.Widget);

            const filterActive = await screen.findByTestId("filter-active");
            await userEvent.click(filterActive);

            await waitFor(() => {
                expect(screen.queryAllByText("Active todo").length).toBeGreaterThan(0);
                expect(screen.queryAllByText("Completed todo")).toHaveLength(0);
            });
        });

        it("filters to show only completed todos", async () => {
            await render(<TestApp />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");
            await addTodo(input, addButton, "Active todo");
            await addTodo(input, addButton, "Completed todo");

            const checkboxes = await screen.findAllByRole(Gtk.AccessibleRole.CHECKBOX);
            await userEvent.click(checkboxes[1] as Gtk.Widget);

            const filterCompleted = await screen.findByTestId("filter-completed");
            await userEvent.click(filterCompleted);

            await waitFor(() => {
                expect(screen.queryAllByText("Completed todo").length).toBeGreaterThan(0);
                expect(screen.queryAllByText("Active todo")).toHaveLength(0);
            });
        });
    });

    describe("clear completed", () => {
        it("shows clear completed button when there are completed todos", async () => {
            await render(<TestApp />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");
            await addTodo(input, addButton, "Test todo");

            await expect(screen.findByTestId("clear-completed", { timeout: 100 })).rejects.toThrow();

            const checkbox = await screen.findByRole(Gtk.AccessibleRole.CHECKBOX);
            await userEvent.click(checkbox);

            const clearButton = await screen.findByTestId("clear-completed");
            expect(clearButton).toBeDefined();
        });

        it("removes all completed todos when clicking clear", async () => {
            await render(<TestApp />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");
            await addTodo(input, addButton, "Keep this");
            await addTodo(input, addButton, "Delete this");

            const checkboxes = await screen.findAllByRole(Gtk.AccessibleRole.CHECKBOX);
            await userEvent.click(checkboxes[1] as Gtk.Widget);

            const clearButton = await screen.findByTestId("clear-completed");
            await userEvent.click(clearButton);

            await waitFor(() => {
                expect(screen.queryAllByText("Keep this").length).toBeGreaterThan(0);
                expect(screen.queryAllByText("Delete this")).toHaveLength(0);
            });
        });
    });
});
