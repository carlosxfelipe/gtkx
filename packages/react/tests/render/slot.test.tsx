import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Button, HeaderBar, Label, MenuButton, Popover } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

describe("render - Slot", () => {
    it("sets slot child via Widget.SlotName pattern", async () => {
        const headerBarRef = createRef<Gtk.HeaderBar>();
        const titleRef = createRef<Gtk.Label>();

        render(
            <HeaderBar.Root ref={headerBarRef}>
                <HeaderBar.TitleWidget>
                    <Label ref={titleRef} label="Custom Title" />
                </HeaderBar.TitleWidget>
            </HeaderBar.Root>,
        );
        await flushMicrotasks();

        expect(headerBarRef.current?.getTitleWidget()?.id).toEqual(titleRef.current?.id);
    });

    it("calls setSlotName(widget) on parent", async () => {
        const menuButtonRef = createRef<Gtk.MenuButton>();
        const labelRef = createRef<Gtk.Label>();

        render(
            <MenuButton.Root ref={menuButtonRef}>
                <MenuButton.Child>
                    <Label ref={labelRef} label="Button Content" />
                </MenuButton.Child>
            </MenuButton.Root>,
        );
        await flushMicrotasks();

        expect(menuButtonRef.current?.getChild()?.id).toEqual(labelRef.current?.id);
    });

    it("clears slot when child removed", async () => {
        const headerBarRef = createRef<Gtk.HeaderBar>();

        function App({ showTitle }: { showTitle: boolean }) {
            return (
                <HeaderBar.Root ref={headerBarRef}>
                    {showTitle && (
                        <HeaderBar.TitleWidget>
                            <Label label="Title" />
                        </HeaderBar.TitleWidget>
                    )}
                </HeaderBar.Root>
            );
        }

        render(<App showTitle={true} />);
        await flushMicrotasks();

        expect(headerBarRef.current?.getTitleWidget()).not.toBeNull();

        render(<App showTitle={false} />);
        await flushMicrotasks();

        expect(headerBarRef.current?.getTitleWidget()).toBeNull();
    });

    it("updates slot when child changes", async () => {
        const headerBarRef = createRef<Gtk.HeaderBar>();
        const label1Ref = createRef<Gtk.Label>();
        const label2Ref = createRef<Gtk.Label>();

        function App({ first }: { first: boolean }) {
            return (
                <HeaderBar.Root ref={headerBarRef}>
                    <HeaderBar.TitleWidget>
                        {first ? (
                            <Label ref={label1Ref} key="first" label="First Title" />
                        ) : (
                            <Label ref={label2Ref} key="second" label="Second Title" />
                        )}
                    </HeaderBar.TitleWidget>
                </HeaderBar.Root>
            );
        }

        render(<App first={true} />);
        await flushMicrotasks();

        expect(headerBarRef.current?.getTitleWidget()?.id).toEqual(label1Ref.current?.id);

        render(<App first={false} />);
        await flushMicrotasks();

        expect(headerBarRef.current?.getTitleWidget()?.id).toEqual(label2Ref.current?.id);
    });

    it("handles MenuButton.Child slot", async () => {
        const menuButtonRef = createRef<Gtk.MenuButton>();
        const labelRef = createRef<Gtk.Label>();

        render(
            <MenuButton.Root ref={menuButtonRef}>
                <MenuButton.Child>
                    <Label ref={labelRef} label="Custom Child" />
                </MenuButton.Child>
            </MenuButton.Root>,
        );
        await flushMicrotasks();

        expect(menuButtonRef.current?.getChild()?.id).toEqual(labelRef.current?.id);
    });

    it("handles MenuButton.Popover slot", async () => {
        const menuButtonRef = createRef<Gtk.MenuButton>();
        const popoverRef = createRef<Gtk.Popover>();

        render(
            <MenuButton.Root ref={menuButtonRef}>
                <MenuButton.Popover>
                    <Popover.Root ref={popoverRef}>
                        <Label label="Popover Content" />
                    </Popover.Root>
                </MenuButton.Popover>
            </MenuButton.Root>,
        );
        await flushMicrotasks();

        expect(menuButtonRef.current?.getPopover()?.id).toEqual(popoverRef.current?.id);
    });

    it("handles multiple slots on same parent", async () => {
        const menuButtonRef = createRef<Gtk.MenuButton>();
        const labelRef = createRef<Gtk.Label>();
        const popoverRef = createRef<Gtk.Popover>();

        render(
            <MenuButton.Root ref={menuButtonRef}>
                <MenuButton.Child>
                    <Label ref={labelRef} label="Button Label" />
                </MenuButton.Child>
                <MenuButton.Popover>
                    <Popover.Root ref={popoverRef}>
                        <Label label="Popover Content" />
                    </Popover.Root>
                </MenuButton.Popover>
            </MenuButton.Root>,
        );
        await flushMicrotasks();

        expect(menuButtonRef.current?.getChild()?.id).toEqual(labelRef.current?.id);
        expect(menuButtonRef.current?.getPopover()?.id).toEqual(popoverRef.current?.id);
    });

    it("supports direct children in headerbar", async () => {
        const headerBarRef = createRef<Gtk.HeaderBar>();
        const buttonRef = createRef<Gtk.Button>();

        render(
            <HeaderBar.Root ref={headerBarRef}>
                <Button ref={buttonRef} label="Direct Button" />
            </HeaderBar.Root>,
        );
        await flushMicrotasks();

        expect(buttonRef.current?.getParent()?.id).toEqual(headerBarRef.current?.id);
    });
});
