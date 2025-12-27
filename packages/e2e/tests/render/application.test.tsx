import type * as Gtk from "@gtkx/ffi/gtk";
import { Menu } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { describe, expect, it } from "vitest";

describe("render - Application", () => {
    describe("ApplicationNode", () => {
        it("sets menubar from Menu children", async () => {
            const { container } = await render(
                <>
                    <Menu.Submenu label="File">
                        <Menu.Item id="new" label="New" onActivate={() => {}} />
                        <Menu.Item id="open" label="Open" onActivate={() => {}} />
                    </Menu.Submenu>
                    <Menu.Submenu label="Edit">
                        <Menu.Item id="cut" label="Cut" onActivate={() => {}} />
                    </Menu.Submenu>
                </>,
                { wrapper: false },
            );

            const app = container as Gtk.Application;
            expect(app.getMenubar()).not.toBeNull();
        });

        it("clears menubar when Menu is removed", async () => {
            function App({ showMenu }: { showMenu: boolean }) {
                return showMenu ? (
                    <Menu.Submenu label="File">
                        <Menu.Item id="new" label="New" onActivate={() => {}} />
                    </Menu.Submenu>
                ) : null;
            }

            const { container, rerender } = await render(<App showMenu={true} />, { wrapper: false });

            const app = container as Gtk.Application;
            expect(app.getMenubar()).not.toBeNull();

            await rerender(<App showMenu={false} />);
            expect(app.getMenubar()).toBeNull();
        });

        it("updates menubar when items change", async () => {
            function App({ items }: { items: string[] }) {
                return (
                    <Menu.Submenu label="File">
                        {items.map((label) => (
                            <Menu.Item key={label} id={label} label={label} onActivate={() => {}} />
                        ))}
                    </Menu.Submenu>
                );
            }

            const { container, rerender } = await render(<App items={["New", "Open"]} />, { wrapper: false });

            const app = container as Gtk.Application;
            expect(app.getMenubar()).not.toBeNull();

            await rerender(<App items={["New", "Open", "Save"]} />);
            expect(app.getMenubar()).not.toBeNull();
        });
    });
});
