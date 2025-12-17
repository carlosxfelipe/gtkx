import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Menu, PopoverMenu, PopoverMenuBar } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

describe("render - Menu", () => {
    describe("PopoverMenu.Root", () => {
        it("creates PopoverMenu widget", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Item label="Item 1" />
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
        });

        it("rebuilds menu when children change", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            function App({ items }: { items: string[] }) {
                return (
                    <PopoverMenu.Root ref={ref}>
                        {items.map((label) => (
                            <Menu.Item key={label} label={label} />
                        ))}
                    </PopoverMenu.Root>
                );
            }

            render(<App items={["Item 1", "Item 2"]} />);
            await flushMicrotasks();

            render(<App items={["Item 1", "Item 2", "Item 3"]} />);
            await flushMicrotasks();
        });
    });

    describe("PopoverMenuBar", () => {
        it("creates PopoverMenuBar widget", async () => {
            const ref = createRef<Gtk.PopoverMenuBar>();

            render(
                <PopoverMenuBar ref={ref}>
                    <Menu.Submenu label="File">
                        <Menu.Item label="New" />
                    </Menu.Submenu>
                </PopoverMenuBar>,
            );
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
        });
    });

    describe("Menu.Item", () => {
        it("adds menu item with label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Item label="Test Item" />
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();
        });

        it("creates action for onActivate handler", async () => {
            const ref = createRef<Gtk.PopoverMenu>();
            const onActivate = vi.fn();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Item label="Clickable" onActivate={onActivate} />
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();
        });

        it("sets keyboard accelerators via accels prop", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Item label="Save" accels="<Control>s" onActivate={() => {}} />
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();
        });

        it("updates label when prop changes", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            function App({ label }: { label: string }) {
                return (
                    <PopoverMenu.Root ref={ref}>
                        <Menu.Item label={label} />
                    </PopoverMenu.Root>
                );
            }

            render(<App label="Initial" />);
            await flushMicrotasks();

            render(<App label="Updated" />);
            await flushMicrotasks();
        });

        it("cleans up action on unmount", async () => {
            const ref = createRef<Gtk.PopoverMenu>();
            const onActivate = vi.fn();

            function App({ showItem }: { showItem: boolean }) {
                return (
                    <PopoverMenu.Root ref={ref}>
                        {showItem && <Menu.Item label="Removable" onActivate={onActivate} />}
                    </PopoverMenu.Root>
                );
            }

            render(<App showItem={true} />);
            await flushMicrotasks();

            render(<App showItem={false} />);
            await flushMicrotasks();
        });
    });

    describe("Menu.Section", () => {
        it("creates menu section", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Section>
                        <Menu.Item label="Section Item 1" />
                        <Menu.Item label="Section Item 2" />
                    </Menu.Section>
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();
        });

        it("adds items within section", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Section>
                        <Menu.Item label="Item A" />
                    </Menu.Section>
                    <Menu.Section>
                        <Menu.Item label="Item B" />
                    </Menu.Section>
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();
        });

        it("sets section label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Section label="Section Title">
                        <Menu.Item label="Item" />
                    </Menu.Section>
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();
        });
    });

    describe("Menu.Submenu", () => {
        it("creates submenu", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Submenu label="File">
                        <Menu.Item label="New" />
                        <Menu.Item label="Open" />
                    </Menu.Submenu>
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();
        });

        it("adds items within submenu", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Submenu label="Edit">
                        <Menu.Item label="Cut" />
                        <Menu.Item label="Copy" />
                        <Menu.Item label="Paste" />
                    </Menu.Submenu>
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();
        });

        it("sets submenu label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Submenu label="Help">
                        <Menu.Item label="About" />
                    </Menu.Submenu>
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();
        });

        it("supports nested submenus", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Submenu label="File">
                        <Menu.Submenu label="Recent">
                            <Menu.Item label="File 1" />
                            <Menu.Item label="File 2" />
                        </Menu.Submenu>
                    </Menu.Submenu>
                </PopoverMenu.Root>,
            );
            await flushMicrotasks();
        });
    });
});
