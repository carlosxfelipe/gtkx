import type * as Gtk from "@gtkx/ffi/gtk";
import type { AccessibleRole } from "@gtkx/ffi/gtk";
import type { ComponentType, ReactNode } from "react";

export interface TextMatchOptions {
    exact?: boolean;
    normalizer?: (text: string) => string;
}

export interface ByRoleOptions extends TextMatchOptions {
    name?: string | RegExp;
    checked?: boolean;
    pressed?: boolean;
    selected?: boolean;
    expanded?: boolean;
    level?: number;
}

export interface WaitForOptions {
    timeout?: number;
    interval?: number;
    onTimeout?: (error: Error) => Error;
}

export interface RenderOptions {
    wrapper?: ComponentType<{ children: ReactNode }>;
}

export interface RenderResult {
    container: Gtk.Application;

    findByRole: (role: AccessibleRole, options?: ByRoleOptions) => Promise<Gtk.Widget>;
    findByLabelText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget>;
    findByText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget>;
    findByTestId: (testId: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget>;

    findAllByRole: (role: AccessibleRole, options?: ByRoleOptions) => Promise<Gtk.Widget[]>;
    findAllByLabelText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;
    findAllByText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;
    findAllByTestId: (testId: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;

    unmount: () => Promise<void>;
    rerender: (element: ReactNode) => Promise<void>;
    debug: () => void;
}
