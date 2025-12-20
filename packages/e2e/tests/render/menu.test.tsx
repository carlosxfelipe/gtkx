import type * as Gtk from "@gtkx/ffi/gtk";
import { Menu, PopoverMenu, PopoverMenuBar } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("render - Menu", () => {
    describe("PopoverMenu.Root", () => {
        it("creates PopoverMenu widget", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Item label="Item 1" />
                </PopoverMenu.Root>,
                { wrapper: false },
            );

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

            await render(<App items={["Item 1", "Item 2"]} />, { wrapper: false });

            await render(<App items={["Item 1", "Item 2", "Item 3"]} />, { wrapper: false });
        });
    });

    describe("PopoverMenuBar", () => {
        it("creates PopoverMenuBar widget", async () => {
            const ref = createRef<Gtk.PopoverMenuBar>();

            await render(
                <PopoverMenuBar ref={ref}>
                    <Menu.Submenu label="File">
                        <Menu.Item label="New" />
                    </Menu.Submenu>
                </PopoverMenuBar>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });
    });

    describe("Menu.Item", () => {
        it("adds menu item with label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Item label="Test Item" />
                </PopoverMenu.Root>,
                { wrapper: false },
            );
        });

        it("sets keyboard accelerators via accels prop", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Item label="Save" accels="<Control>s" onActivate={() => {}} />
                </PopoverMenu.Root>,
                { wrapper: false },
            );
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

            await render(<App label="Initial" />, { wrapper: false });

            await render(<App label="Updated" />, { wrapper: false });
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

            await render(<App showItem={true} />, { wrapper: false });

            await render(<App showItem={false} />, { wrapper: false });
        });
    });

    describe("Menu.Section", () => {
        it("creates menu section", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Section>
                        <Menu.Item label="Section Item 1" />
                        <Menu.Item label="Section Item 2" />
                    </Menu.Section>
                </PopoverMenu.Root>,
                { wrapper: false },
            );
        });

        it("adds items within section", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Section>
                        <Menu.Item label="Item A" />
                    </Menu.Section>
                    <Menu.Section>
                        <Menu.Item label="Item B" />
                    </Menu.Section>
                </PopoverMenu.Root>,
                { wrapper: false },
            );
        });

        it("sets section label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Section label="Section Title">
                        <Menu.Item label="Item" />
                    </Menu.Section>
                </PopoverMenu.Root>,
                { wrapper: false },
            );
        });
    });

    describe("Menu.Submenu", () => {
        it("creates submenu", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Submenu label="File">
                        <Menu.Item label="New" />
                        <Menu.Item label="Open" />
                    </Menu.Submenu>
                </PopoverMenu.Root>,
                { wrapper: false },
            );
        });

        it("adds items within submenu", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Submenu label="Edit">
                        <Menu.Item label="Cut" />
                        <Menu.Item label="Copy" />
                        <Menu.Item label="Paste" />
                    </Menu.Submenu>
                </PopoverMenu.Root>,
                { wrapper: false },
            );
        });

        it("sets submenu label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Submenu label="Help">
                        <Menu.Item label="About" />
                    </Menu.Submenu>
                </PopoverMenu.Root>,
                { wrapper: false },
            );
        });

        it("supports nested submenus", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <PopoverMenu.Root ref={ref}>
                    <Menu.Submenu label="File">
                        <Menu.Submenu label="Recent">
                            <Menu.Item label="File 1" />
                            <Menu.Item label="File 2" />
                        </Menu.Submenu>
                    </Menu.Submenu>
                </PopoverMenu.Root>,
                { wrapper: false },
            );
        });
    });
});
