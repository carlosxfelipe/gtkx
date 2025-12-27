import type * as Gtk from "@gtkx/ffi/gtk";
import * as queries from "./queries.js";
import type { ByRoleOptions, TextMatch, TextMatchOptions } from "./types.js";

let currentRoot: Gtk.Application | null = null;

/** @internal */
export const setScreenRoot = (root: Gtk.Application | null): void => {
    currentRoot = root;
};

const getRoot = (): Gtk.Application => {
    if (!currentRoot) {
        throw new Error("No render has been performed: call render() before using screen queries");
    }

    return currentRoot;
};

/**
 * Global query object for accessing rendered components.
 *
 * Provides the same query methods as render result, but automatically
 * uses the most recently rendered application as the container.
 *
 * @example
 * ```tsx
 * import { render, screen } from "@gtkx/testing";
 *
 * test("finds button", async () => {
 *   await render(<MyComponent />);
 *   const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON);
 *   expect(button).toBeDefined();
 * });
 * ```
 *
 * @see {@link render} for rendering components
 * @see {@link within} for scoped queries
 */
export const screen = {
    /** Find single element by accessible role */
    findByRole: (role: Gtk.AccessibleRole, options?: ByRoleOptions) => queries.findByRole(getRoot(), role, options),
    /** Find single element by label/text content */
    findByLabelText: (text: TextMatch, options?: TextMatchOptions) => queries.findByLabelText(getRoot(), text, options),
    /** Find single element by visible text */
    findByText: (text: TextMatch, options?: TextMatchOptions) => queries.findByText(getRoot(), text, options),
    /** Find single element by test ID (widget name) */
    findByTestId: (testId: TextMatch, options?: TextMatchOptions) => queries.findByTestId(getRoot(), testId, options),
    /** Find all elements by accessible role */
    findAllByRole: (role: Gtk.AccessibleRole, options?: ByRoleOptions) =>
        queries.findAllByRole(getRoot(), role, options),
    /** Find all elements by label/text content */
    findAllByLabelText: (text: TextMatch, options?: TextMatchOptions) =>
        queries.findAllByLabelText(getRoot(), text, options),
    /** Find all elements by visible text */
    findAllByText: (text: TextMatch, options?: TextMatchOptions) => queries.findAllByText(getRoot(), text, options),
    /** Find all elements by test ID (widget name) */
    findAllByTestId: (testId: TextMatch, options?: TextMatchOptions) =>
        queries.findAllByTestId(getRoot(), testId, options),
    /** Print debug info to console */
    debug: () => {
        console.log("Screen debug - root:", getRoot());
    },
};
