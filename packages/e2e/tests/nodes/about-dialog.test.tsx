import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkAboutDialog, GtkApplicationWindow } from "@gtkx/react";
import { render as baseRender } from "@gtkx/testing";
import type { ReactNode } from "react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

const render = (element: ReactNode) => baseRender(element, { wrapper: false });

describe("render - AboutDialog", () => {
    describe("creditSections", () => {
        it("applies credit sections on mount", async () => {
            const ref = createRef<Gtk.AboutDialog>();

            await render(
                <GtkApplicationWindow>
                    <GtkAboutDialog
                        ref={ref}
                        programName="Test App"
                        creditSections={[
                            { name: "Contributors", people: ["Alice", "Bob"] },
                            { name: "Testers", people: ["Charlie"] },
                        ]}
                    />
                </GtkApplicationWindow>,
            );

            expect(ref.current).not.toBeNull();
        });

        it("applies empty credit sections array", async () => {
            const ref = createRef<Gtk.AboutDialog>();

            await render(
                <GtkApplicationWindow>
                    <GtkAboutDialog ref={ref} programName="Test App" creditSections={[]} />
                </GtkApplicationWindow>,
            );

            expect(ref.current).not.toBeNull();
        });

        it("renders without creditSections prop", async () => {
            const ref = createRef<Gtk.AboutDialog>();

            await render(
                <GtkApplicationWindow>
                    <GtkAboutDialog ref={ref} programName="Test App" />
                </GtkApplicationWindow>,
            );

            expect(ref.current).not.toBeNull();
        });
    });

    describe("lifecycle", () => {
        it("presents dialog on mount", async () => {
            const ref = createRef<Gtk.AboutDialog>();

            await render(
                <GtkApplicationWindow>
                    <GtkAboutDialog ref={ref} programName="Lifecycle Test" />
                </GtkApplicationWindow>,
            );

            expect(ref.current?.getVisible()).toBe(true);
        });

        it("destroys dialog on unmount", async () => {
            const ref = createRef<Gtk.AboutDialog>();

            function App({ show }: { show: boolean }) {
                return (
                    <GtkApplicationWindow>
                        {show ? <GtkAboutDialog ref={ref} programName="Unmount Test" /> : null}
                    </GtkApplicationWindow>
                );
            }

            await render(<App show={true} />);

            const handle = ref.current?.handle;
            expect(handle).toBeDefined();

            await render(<App show={false} />);
        });
    });
});
