import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkMenuButton, GtkPopoverMenu, Menu } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("render - PopoverMenu", () => {
    describe("PopoverMenuNode", () => {
        it("creates PopoverMenu widget", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(<GtkPopoverMenu ref={ref} />, { wrapper: false });

            expect(ref.current).not.toBeNull();
        });

        it("sets menu model", async () => {
            const popoverRef = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={popoverRef}>
                    <Menu.Item label="Item 1" />
                    <Menu.Item label="Item 2" />
                </GtkPopoverMenu>,
                { wrapper: false },
            );

            expect(popoverRef.current?.getMenuModel()?.getNItems()).toBeGreaterThan(0);
        });

        it("handles MenuButton parent", async () => {
            const buttonRef = createRef<Gtk.MenuButton>();

            await render(
                <GtkMenuButton ref={buttonRef}>
                    <Menu.Item label="Option 1" />
                    <Menu.Item label="Option 2" />
                </GtkMenuButton>,
                { wrapper: false },
            );

            expect(buttonRef.current?.getMenuModel()?.getNItems()).toBeGreaterThan(0);
        });

        it("adds menu items", async () => {
            const popoverRef = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={popoverRef}>
                    <Menu.Item label="First" />
                    <Menu.Item label="Second" />
                    <Menu.Item label="Third" />
                </GtkPopoverMenu>,
                { wrapper: false },
            );

            expect(popoverRef.current?.getMenuModel()?.getNItems()).toBe(3);
        });

        it("handles menu item with action", async () => {
            const popoverRef = createRef<Gtk.PopoverMenu>();
            const action = vi.fn();

            await render(
                <GtkPopoverMenu ref={popoverRef}>
                    <Menu.Item label="Click Me" action={action} />
                </GtkPopoverMenu>,
                { wrapper: false },
            );

            expect(popoverRef.current?.getMenuModel()?.getNItems()).toBe(1);
        });

        it("removes menu items", async () => {
            const popoverRef = createRef<Gtk.PopoverMenu>();

            function App({ items }: { items: string[] }) {
                return (
                    <GtkPopoverMenu ref={popoverRef}>
                        {items.map((label) => (
                            <Menu.Item key={label} label={label} />
                        ))}
                    </GtkPopoverMenu>
                );
            }

            await render(<App items={["A", "B", "C"]} />, { wrapper: false });
            expect(popoverRef.current?.getMenuModel()?.getNItems()).toBe(3);

            await render(<App items={["A"]} />, { wrapper: false });
            expect(popoverRef.current?.getMenuModel()?.getNItems()).toBe(1);
        });

        it("handles menu sections", async () => {
            const popoverRef = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={popoverRef}>
                    <Menu.Section>
                        <Menu.Item label="Section 1 Item" />
                    </Menu.Section>
                    <Menu.Section>
                        <Menu.Item label="Section 2 Item" />
                    </Menu.Section>
                </GtkPopoverMenu>,
                { wrapper: false },
            );

            expect(popoverRef.current?.getMenuModel()).not.toBeNull();
        });
    });
});
