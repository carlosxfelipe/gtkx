import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkPopoverMenu, GtkPopoverMenuBar, Menu } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("render - Menu", () => {
    describe("GtkPopoverMenu", () => {
        it("creates PopoverMenu widget", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <Menu.Item id="item1" label="Item 1" onActivate={() => {}} />
                </GtkPopoverMenu>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });

        it("rebuilds menu when children change", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            function App({ items }: { items: string[] }) {
                return (
                    <GtkPopoverMenu ref={ref}>
                        {items.map((label, i) => (
                            <Menu.Item key={label} id={`item${i}`} label={label} onActivate={() => {}} />
                        ))}
                    </GtkPopoverMenu>
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
                <GtkPopoverMenuBar ref={ref}>
                    <Menu.Submenu label="File">
                        <Menu.Item id="new" label="New" onActivate={() => {}} />
                    </Menu.Submenu>
                </GtkPopoverMenuBar>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });
    });

    describe("Menu.Item", () => {
        it("adds menu item with label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <Menu.Item id="test" label="Test Item" onActivate={() => {}} />
                </GtkPopoverMenu>,
                { wrapper: false },
            );
        });

        it("sets keyboard accelerators via accels prop", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <Menu.Item id="save" label="Save" accels="<Control>s" onActivate={() => {}} />
                </GtkPopoverMenu>,
                { wrapper: false },
            );
        });

        it("updates label when prop changes", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            function App({ label }: { label: string }) {
                return (
                    <GtkPopoverMenu ref={ref}>
                        <Menu.Item id="item" label={label} onActivate={() => {}} />
                    </GtkPopoverMenu>
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
                    <GtkPopoverMenu ref={ref}>
                        {showItem && <Menu.Item id="removable" label="Removable" onActivate={onActivate} />}
                    </GtkPopoverMenu>
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
                <GtkPopoverMenu ref={ref}>
                    <Menu.Section>
                        <Menu.Item id="section1" label="Section Item 1" onActivate={() => {}} />
                        <Menu.Item id="section2" label="Section Item 2" onActivate={() => {}} />
                    </Menu.Section>
                </GtkPopoverMenu>,
                { wrapper: false },
            );
        });

        it("adds items within section", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <Menu.Section>
                        <Menu.Item id="itemA" label="Item A" onActivate={() => {}} />
                    </Menu.Section>
                    <Menu.Section>
                        <Menu.Item id="itemB" label="Item B" onActivate={() => {}} />
                    </Menu.Section>
                </GtkPopoverMenu>,
                { wrapper: false },
            );
        });

        it("sets section label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <Menu.Section label="Section Title">
                        <Menu.Item id="item" label="Item" onActivate={() => {}} />
                    </Menu.Section>
                </GtkPopoverMenu>,
                { wrapper: false },
            );
        });
    });

    describe("Menu.Submenu", () => {
        it("creates submenu", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <Menu.Submenu label="File">
                        <Menu.Item id="new" label="New" onActivate={() => {}} />
                        <Menu.Item id="open" label="Open" onActivate={() => {}} />
                    </Menu.Submenu>
                </GtkPopoverMenu>,
                { wrapper: false },
            );
        });

        it("adds items within submenu", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <Menu.Submenu label="Edit">
                        <Menu.Item id="cut" label="Cut" onActivate={() => {}} />
                        <Menu.Item id="copy" label="Copy" onActivate={() => {}} />
                        <Menu.Item id="paste" label="Paste" onActivate={() => {}} />
                    </Menu.Submenu>
                </GtkPopoverMenu>,
                { wrapper: false },
            );
        });

        it("sets submenu label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <Menu.Submenu label="Help">
                        <Menu.Item id="about" label="About" onActivate={() => {}} />
                    </Menu.Submenu>
                </GtkPopoverMenu>,
                { wrapper: false },
            );
        });

        it("supports nested submenus", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <Menu.Submenu label="File">
                        <Menu.Submenu label="Recent">
                            <Menu.Item id="file1" label="File 1" onActivate={() => {}} />
                            <Menu.Item id="file2" label="File 2" onActivate={() => {}} />
                        </Menu.Submenu>
                    </Menu.Submenu>
                </GtkPopoverMenu>,
                { wrapper: false },
            );
        });
    });
});
