import type * as Gtk from "@gtkx/ffi/gtk";
import type { AccessibleRole } from "@gtkx/ffi/gtk";
import type { ComponentType, ReactNode } from "react";

/**
 * Options for text matching in queries.
 */
export interface TextMatchOptions {
    /** Whether to match the entire string exactly. Defaults to true. */
    exact?: boolean;
    /** Custom function to normalize text before comparison. */
    normalizer?: (text: string) => string;
    /** Maximum time in milliseconds to wait for a match. */
    timeout?: number;
}

/**
 * Options for querying elements by their accessible role.
 */
export interface ByRoleOptions extends TextMatchOptions {
    /** Filter by the element's accessible name. */
    name?: string | RegExp;
    /** Filter checkboxes/switches by checked state. */
    checked?: boolean;
    /** Filter toggle buttons by pressed state. */
    pressed?: boolean;
    /** Filter selectable items by selected state. */
    selected?: boolean;
    /** Filter expandable elements by expanded state. */
    expanded?: boolean;
    /** Filter headings by their level (1-6). */
    level?: number;
}

/**
 * Options for waitFor and related async utilities.
 */
export interface WaitForOptions {
    /** Maximum time in milliseconds to wait. Defaults to 1000ms. */
    timeout?: number;
    /** Interval in milliseconds between condition checks. Defaults to 50ms. */
    interval?: number;
    /** Custom error handler called when timeout is reached. */
    onTimeout?: (error: Error) => Error;
}

/**
 * Options for the render function.
 */
export interface RenderOptions {
    /** A React component to wrap the rendered element. Useful for providing context. */
    wrapper?: ComponentType<{ children: ReactNode }>;
}

/**
 * Query methods bound to a specific container. All queries return promises
 * that resolve when a matching element is found or reject on timeout.
 */
export interface BoundQueries {
    /** Find a single element by its accessible role. */
    findByRole: (role: AccessibleRole, options?: ByRoleOptions) => Promise<Gtk.Widget>;
    /** Find a single element by its associated label text. */
    findByLabelText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget>;
    /** Find a single element by its text content. */
    findByText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget>;
    /** Find a single element by its test ID. */
    findByTestId: (testId: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget>;

    /** Find all elements matching an accessible role. */
    findAllByRole: (role: AccessibleRole, options?: ByRoleOptions) => Promise<Gtk.Widget[]>;
    /** Find all elements with matching label text. */
    findAllByLabelText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;
    /** Find all elements with matching text content. */
    findAllByText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;
    /** Find all elements with matching test ID. */
    findAllByTestId: (testId: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;
}

/**
 * The result returned by the render function. Includes query methods
 * and utilities for interacting with the rendered component.
 */
export interface RenderResult extends BoundQueries {
    /** The GTK Application instance containing the rendered component. */
    container: Gtk.Application;

    /** Unmount the rendered component and clean up resources. */
    unmount: () => Promise<void>;
    /** Re-render with a new element, preserving state where possible. */
    rerender: (element: ReactNode) => Promise<void>;
    /** Print the current widget tree to the console for debugging. */
    debug: () => void;
}
