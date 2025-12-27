import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkLabel, GtkNotebook, NotebookPage } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - NotebookPage", () => {
    describe("NotebookPageNode", () => {
        it("adds page to Notebook", async () => {
            const notebookRef = createRef<Gtk.Notebook>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <NotebookPage label="Page 1">Content 1</NotebookPage>
                </GtkNotebook>,
            );

            expect(notebookRef.current?.getNPages()).toBe(1);
        });

        it("sets page tab label", async () => {
            const notebookRef = createRef<Gtk.Notebook>();
            const contentRef = createRef<Gtk.Label>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <NotebookPage label="My Tab">
                        <GtkLabel ref={contentRef} label="Content" />
                    </NotebookPage>
                </GtkNotebook>,
            );

            const tabLabel = notebookRef.current?.getTabLabel(contentRef.current as Gtk.Widget) as Gtk.Label;
            expect(tabLabel?.getLabel()).toBe("My Tab");
        });

        it("updates tab label on prop change", async () => {
            const notebookRef = createRef<Gtk.Notebook>();
            const contentRef = createRef<Gtk.Label>();

            function App({ tabLabel }: { tabLabel: string }) {
                return (
                    <GtkNotebook ref={notebookRef}>
                        <NotebookPage label={tabLabel}>
                            <GtkLabel ref={contentRef} label="Content" />
                        </NotebookPage>
                    </GtkNotebook>
                );
            }

            await render(<App tabLabel="Initial" />);
            let tabLabel = notebookRef.current?.getTabLabel(contentRef.current as Gtk.Widget) as Gtk.Label;
            expect(tabLabel?.getLabel()).toBe("Initial");

            await render(<App tabLabel="Updated" />);
            tabLabel = notebookRef.current?.getTabLabel(contentRef.current as Gtk.Widget) as Gtk.Label;
            expect(tabLabel?.getLabel()).toBe("Updated");
        });

        it("adds multiple pages", async () => {
            const notebookRef = createRef<Gtk.Notebook>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <NotebookPage label="Page 1">Content 1</NotebookPage>
                    <NotebookPage label="Page 2">Content 2</NotebookPage>
                    <NotebookPage label="Page 3">Content 3</NotebookPage>
                </GtkNotebook>,
            );

            expect(notebookRef.current?.getNPages()).toBe(3);
        });

        it("removes page from Notebook", async () => {
            const notebookRef = createRef<Gtk.Notebook>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <GtkNotebook ref={notebookRef}>
                        {pages.map((label) => (
                            <NotebookPage key={label} label={label}>
                                {label}
                            </NotebookPage>
                        ))}
                    </GtkNotebook>
                );
            }

            await render(<App pages={["A", "B", "C"]} />);
            expect(notebookRef.current?.getNPages()).toBe(3);

            await render(<App pages={["A", "C"]} />);
            expect(notebookRef.current?.getNPages()).toBe(2);
        });

        it("handles page reordering", async () => {
            const notebookRef = createRef<Gtk.Notebook>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <GtkNotebook ref={notebookRef}>
                        {pages.map((label) => (
                            <NotebookPage key={label} label={label}>
                                {label}
                            </NotebookPage>
                        ))}
                    </GtkNotebook>
                );
            }

            await render(<App pages={["First", "Second", "Third"]} />);
            await render(<App pages={["Second", "First", "Third"]} />);

            expect(notebookRef.current?.getNPages()).toBe(3);
        });
    });
});
