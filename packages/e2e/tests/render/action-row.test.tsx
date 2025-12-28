import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { ActionRow, AdwActionRow, GtkLabel, GtkListBox } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ActionRow", () => {
    describe("ActionRowNode (AdwActionRow)", () => {
        it("creates ActionRow widget", async () => {
            const ref = createRef<Adw.ActionRow>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={ref} title="Test Row" />
                </GtkListBox>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });

        it("appends prefix and suffix children", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const prefixRef = createRef<Gtk.Label>();
            const suffixRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <ActionRow.Prefix>
                            <GtkLabel ref={prefixRef} label="First" />
                        </ActionRow.Prefix>
                        <ActionRow.Suffix>
                            <GtkLabel ref={suffixRef} label="Second" />
                        </ActionRow.Suffix>
                    </AdwActionRow>
                </GtkListBox>,
                { wrapper: false },
            );

            expect(rowRef.current).not.toBeNull();
            expect(prefixRef.current).not.toBeNull();
            expect(suffixRef.current).not.toBeNull();
        });

        it("removes prefix and suffix children", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const labelRefs = [createRef<Gtk.Label>(), createRef<Gtk.Label>(), createRef<Gtk.Label>()];

            function App({ count }: { count: number }) {
                return (
                    <GtkListBox>
                        <AdwActionRow ref={rowRef} title="Test Row">
                            {Array.from({ length: count }, (_, i) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: Test fixture with stable items
                                <ActionRow.Suffix key={`suffix-label-${i}`}>
                                    <GtkLabel ref={labelRefs[i]} label={`Label ${i}`} />
                                </ActionRow.Suffix>
                            ))}
                        </AdwActionRow>
                    </GtkListBox>
                );
            }

            const { rerender } = await render(<App count={3} />, { wrapper: false });

            expect(labelRefs[0]?.current).not.toBeNull();
            expect(labelRefs[1]?.current).not.toBeNull();
            expect(labelRefs[2]?.current).not.toBeNull();

            await rerender(<App count={1} />);

            expect(labelRefs[0]?.current).not.toBeNull();
            expect(labelRefs[1]?.current).toBeNull();
            expect(labelRefs[2]?.current).toBeNull();
        });
    });
});
