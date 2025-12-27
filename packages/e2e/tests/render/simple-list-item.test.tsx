import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkDropDown, SimpleListItem } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - SimpleListItem", () => {
    describe("SimpleListItemNode", () => {
        it("renders simple list item in DropDown", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            await render(
                <GtkDropDown ref={dropDownRef}>
                    <SimpleListItem id="item1" value="Item Value" />
                </GtkDropDown>,
                { wrapper: false },
            );

            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(1);
        });

        it("handles string value", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            await render(
                <GtkDropDown ref={dropDownRef}>
                    <SimpleListItem id="test" value="Test String" />
                </GtkDropDown>,
                { wrapper: false },
            );

            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(1);
        });

        it("updates value on prop change", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            function App({ value }: { value: string }) {
                return (
                    <GtkDropDown ref={dropDownRef}>
                        <SimpleListItem id="dynamic" value={value} />
                    </GtkDropDown>
                );
            }

            await render(<App value="Initial" />, { wrapper: false });
            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(1);

            await render(<App value="Updated" />, { wrapper: false });
            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(1);
        });

        it("maintains order with multiple items", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            await render(
                <GtkDropDown ref={dropDownRef}>
                    <SimpleListItem id="a" value="First" />
                    <SimpleListItem id="b" value="Second" />
                    <SimpleListItem id="c" value="Third" />
                </GtkDropDown>,
                { wrapper: false },
            );

            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(3);
        });

        it("inserts item before existing item", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            function App({ items }: { items: string[] }) {
                return (
                    <GtkDropDown ref={dropDownRef}>
                        {items.map((item) => (
                            <SimpleListItem key={item} id={item} value={item} />
                        ))}
                    </GtkDropDown>
                );
            }

            await render(<App items={["first", "last"]} />, { wrapper: false });
            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(2);

            await render(<App items={["first", "middle", "last"]} />, { wrapper: false });
            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(3);
        });
    });
});
