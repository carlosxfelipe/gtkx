import type * as Gtk from "@gtkx/ffi/gtk";
import * as queries from "./queries.js";
import type { BoundQueries, ByRoleOptions, TextMatch, TextMatchOptions } from "./types.js";

/**
 * Creates scoped query methods for a container widget.
 *
 * Use this to query within a specific section of your UI rather than
 * the entire application.
 *
 * @param container - The widget to scope queries to
 * @returns Object with query methods bound to the container
 *
 * @example
 * ```tsx
 * import { render, within } from "@gtkx/testing";
 *
 * test("scoped queries", async () => {
 *   await render(<MyPage />);
 *
 *   const sidebar = await screen.findByRole(Gtk.AccessibleRole.NAVIGATION);
 *   const sidebarQueries = within(sidebar);
 *
 *   // Only searches within the sidebar
 *   const navButton = await sidebarQueries.findByRole(Gtk.AccessibleRole.BUTTON);
 * });
 * ```
 *
 * @see {@link screen} for global queries
 */
export const within = (container: Gtk.Widget): BoundQueries => ({
    findByRole: (role, options?: ByRoleOptions) => queries.findByRole(container, role, options),
    findByLabelText: (text: TextMatch, options?: TextMatchOptions) => queries.findByLabelText(container, text, options),
    findByText: (text: TextMatch, options?: TextMatchOptions) => queries.findByText(container, text, options),
    findByTestId: (testId: TextMatch, options?: TextMatchOptions) => queries.findByTestId(container, testId, options),

    findAllByRole: (role, options?: ByRoleOptions) => queries.findAllByRole(container, role, options),
    findAllByLabelText: (text: TextMatch, options?: TextMatchOptions) =>
        queries.findAllByLabelText(container, text, options),
    findAllByText: (text: TextMatch, options?: TextMatchOptions) => queries.findAllByText(container, text, options),
    findAllByTestId: (testId: TextMatch, options?: TextMatchOptions) =>
        queries.findAllByTestId(container, testId, options),
});
