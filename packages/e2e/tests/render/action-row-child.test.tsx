import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { ActionRow, AdwActionRow, GtkLabel, GtkListBox } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ActionRowChild", () => {
    describe("ActionRowChild (ActionRow.Prefix/ActionRow.Suffix)", () => {
        it("adds child as prefix via ActionRow.Prefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const prefixRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <ActionRow.Prefix>
                            <GtkLabel ref={prefixRef} label="Prefix" />
                        </ActionRow.Prefix>
                    </AdwActionRow>
                </GtkListBox>,
                { wrapper: false },
            );

            expect(prefixRef.current).not.toBeNull();
        });

        it("adds child as suffix via ActionRow.Suffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const suffixRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <ActionRow.Suffix>
                            <GtkLabel ref={suffixRef} label="Suffix" />
                        </ActionRow.Suffix>
                    </AdwActionRow>
                </GtkListBox>,
                { wrapper: false },
            );

            expect(suffixRef.current).not.toBeNull();
        });

        it("combines ActionRow.Prefix and ActionRow.Suffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const prefixRef = createRef<Gtk.Label>();
            const suffixRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <ActionRow.Prefix>
                            <GtkLabel ref={prefixRef} label="Prefix" />
                        </ActionRow.Prefix>
                        <ActionRow.Suffix>
                            <GtkLabel ref={suffixRef} label="Suffix" />
                        </ActionRow.Suffix>
                    </AdwActionRow>
                </GtkListBox>,
                { wrapper: false },
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
                                <ActionRow.Prefix>
                                    <GtkLabel ref={prefixRef} label="Prefix" />
                                </ActionRow.Prefix>
                            )}
                            <ActionRow.Suffix>
                                <GtkLabel ref={alwaysRef} label="Always" />
                            </ActionRow.Suffix>
                        </AdwActionRow>
                    </GtkListBox>
                );
            }

            const { rerender } = await render(<App showPrefix={true} />, { wrapper: false });

            expect(prefixRef.current).not.toBeNull();
            expect(alwaysRef.current).not.toBeNull();

            await rerender(<App showPrefix={false} />);

            expect(prefixRef.current).toBeNull();
            expect(alwaysRef.current).not.toBeNull();
        });

        it("adds multiple children as prefix via ActionRow.Prefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <ActionRow.Prefix>
                            <GtkLabel ref={firstRef} label="First" />
                            <GtkLabel ref={secondRef} label="Second" />
                        </ActionRow.Prefix>
                    </AdwActionRow>
                </GtkListBox>,
                { wrapper: false },
            );

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();
        });

        it("adds multiple children as suffix via ActionRow.Suffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <ActionRow.Suffix>
                            <GtkLabel ref={firstRef} label="First" />
                            <GtkLabel ref={secondRef} label="Second" />
                        </ActionRow.Suffix>
                    </AdwActionRow>
                </GtkListBox>,
                { wrapper: false },
            );

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();
        });

        it("removes individual children from ActionRow.Prefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            function App({ showSecond }: { showSecond: boolean }) {
                return (
                    <GtkListBox>
                        <AdwActionRow ref={rowRef} title="Test Row">
                            <ActionRow.Prefix>
                                <GtkLabel ref={firstRef} label="First" />
                                {showSecond && <GtkLabel ref={secondRef} label="Second" />}
                            </ActionRow.Prefix>
                        </AdwActionRow>
                    </GtkListBox>
                );
            }

            const { rerender } = await render(<App showSecond={true} />, { wrapper: false });

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();

            await rerender(<App showSecond={false} />);

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).toBeNull();
        });
    });
});
