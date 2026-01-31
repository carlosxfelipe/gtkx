import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { AdwActionRow, GtkLabel, GtkListBox, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ActionRowChild", () => {
    describe("ContainerSlot (addPrefix/addSuffix)", () => {
        it("adds child as prefix via addPrefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const prefixRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                            <GtkLabel ref={prefixRef} label="Prefix" />
                        </x.ContainerSlot>
                    </AdwActionRow>
                </GtkListBox>,
            );

            expect(prefixRef.current).not.toBeNull();
        });

        it("adds child as suffix via addSuffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const suffixRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                            <GtkLabel ref={suffixRef} label="Suffix" />
                        </x.ContainerSlot>
                    </AdwActionRow>
                </GtkListBox>,
            );

            expect(suffixRef.current).not.toBeNull();
        });

        it("combines addPrefix and addSuffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const prefixRef = createRef<Gtk.Label>();
            const suffixRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                            <GtkLabel ref={prefixRef} label="Prefix" />
                        </x.ContainerSlot>
                        <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                            <GtkLabel ref={suffixRef} label="Suffix" />
                        </x.ContainerSlot>
                    </AdwActionRow>
                </GtkListBox>,
            );

            expect(prefixRef.current).not.toBeNull();
            expect(suffixRef.current).not.toBeNull();
        });

        it("removes prefix child", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const prefixRef = createRef<Gtk.Label>();
            const alwaysRef = createRef<Gtk.Label>();

            function App({ showPrefix }: { showPrefix: boolean }) {
                return (
                    <GtkListBox>
                        <AdwActionRow ref={rowRef} title="Test Row">
                            {showPrefix && (
                                <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                                    <GtkLabel ref={prefixRef} label="Prefix" />
                                </x.ContainerSlot>
                            )}
                            <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                                <GtkLabel ref={alwaysRef} label="Always" />
                            </x.ContainerSlot>
                        </AdwActionRow>
                    </GtkListBox>
                );
            }

            const { rerender } = await render(<App showPrefix={true} />);

            expect(prefixRef.current).not.toBeNull();
            expect(alwaysRef.current).not.toBeNull();

            await rerender(<App showPrefix={false} />);

            expect(prefixRef.current).toBeNull();
            expect(alwaysRef.current).not.toBeNull();
        });

        it("adds multiple children as prefix via addPrefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                            <GtkLabel ref={firstRef} label="First" />
                            <GtkLabel ref={secondRef} label="Second" />
                        </x.ContainerSlot>
                    </AdwActionRow>
                </GtkListBox>,
            );

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();
        });

        it("adds multiple children as suffix via addSuffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                            <GtkLabel ref={firstRef} label="First" />
                            <GtkLabel ref={secondRef} label="Second" />
                        </x.ContainerSlot>
                    </AdwActionRow>
                </GtkListBox>,
            );

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();
        });

        it("removes individual children from addPrefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            function App({ showSecond }: { showSecond: boolean }) {
                return (
                    <GtkListBox>
                        <AdwActionRow ref={rowRef} title="Test Row">
                            <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                                <GtkLabel ref={firstRef} label="First" />
                                {showSecond && <GtkLabel ref={secondRef} label="Second" />}
                            </x.ContainerSlot>
                        </AdwActionRow>
                    </GtkListBox>
                );
            }

            const { rerender } = await render(<App showSecond={true} />);

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();

            await rerender(<App showSecond={false} />);

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).toBeNull();
        });
    });
});
