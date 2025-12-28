import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkLabel, GtkNotebook, Notebook } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - NotebookPage", () => {
    describe("NotebookPageNode", () => {
        it("adds page to Notebook", async () => {
            const notebookRef = createRef<Gtk.Notebook>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <Notebook.Page label="Page 1">Content 1</Notebook.Page>
                </GtkNotebook>,
                { wrapper: false },
            );

            expect(notebookRef.current?.getNPages()).toBe(1);
        });

        it("sets page tab label", async () => {
            const notebookRef = createRef<Gtk.Notebook>();
            const contentRef = createRef<Gtk.Label>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <Notebook.Page label="My Tab">
                        <GtkLabel ref={contentRef} label="Content" />
                    </Notebook.Page>
                </GtkNotebook>,
                { wrapper: false },
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
                        <Notebook.Page label={tabLabel}>
                            <GtkLabel ref={contentRef} label="Content" />
                        </Notebook.Page>
                    </GtkNotebook>
                );
            }

            await render(<App tabLabel="Initial" />, { wrapper: false });
            let tabLabel = notebookRef.current?.getTabLabel(contentRef.current as Gtk.Widget) as Gtk.Label;
            expect(tabLabel?.getLabel()).toBe("Initial");

            await render(<App tabLabel="Updated" />, { wrapper: false });
            tabLabel = notebookRef.current?.getTabLabel(contentRef.current as Gtk.Widget) as Gtk.Label;
            expect(tabLabel?.getLabel()).toBe("Updated");
        });

        it("adds multiple pages", async () => {
            const notebookRef = createRef<Gtk.Notebook>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <Notebook.Page label="Page 1">Content 1</Notebook.Page>
                    <Notebook.Page label="Page 2">Content 2</Notebook.Page>
                    <Notebook.Page label="Page 3">Content 3</Notebook.Page>
                </GtkNotebook>,
                { wrapper: false },
            );

            expect(notebookRef.current?.getNPages()).toBe(3);
        });

        it("removes page from Notebook", async () => {
            const notebookRef = createRef<Gtk.Notebook>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <GtkNotebook ref={notebookRef}>
                        {pages.map((label) => (
                            <Notebook.Page key={label} label={label}>
                                {label}
                            </Notebook.Page>
                        ))}
                    </GtkNotebook>
                );
            }

            await render(<App pages={["A", "B", "C"]} />, { wrapper: false });
            expect(notebookRef.current?.getNPages()).toBe(3);

            await render(<App pages={["A", "C"]} />, { wrapper: false });
            expect(notebookRef.current?.getNPages()).toBe(2);
        });

        it("handles page reordering", async () => {
            const notebookRef = createRef<Gtk.Notebook>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <GtkNotebook ref={notebookRef}>
                        {pages.map((label) => (
                            <Notebook.Page key={label} label={label}>
                                {label}
                            </Notebook.Page>
                        ))}
                    </GtkNotebook>
                );
            }

            await render(<App pages={["First", "Second", "Third"]} />, { wrapper: false });
            await render(<App pages={["Second", "First", "Third"]} />, { wrapper: false });

            expect(notebookRef.current?.getNPages()).toBe(3);
        });
    });

    describe("Notebook.Page (new export)", () => {
        it("works with Notebook.Page export", async () => {
            const notebookRef = createRef<Gtk.Notebook>();
            const contentRef = createRef<Gtk.Label>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <Notebook.Page label="My Tab">
                        <GtkLabel ref={contentRef} label="Content" />
                    </Notebook.Page>
                </GtkNotebook>,
                { wrapper: false },
            );

            expect(notebookRef.current?.getNPages()).toBe(1);
            const tabLabel = notebookRef.current?.getTabLabel(contentRef.current as Gtk.Widget) as Gtk.Label;
            expect(tabLabel?.getLabel()).toBe("My Tab");
        });
    });

    describe("Notebook.PageTab", () => {
        it("sets custom widget as tab label", async () => {
            const notebookRef = createRef<Gtk.Notebook>();
            const contentRef = createRef<Gtk.Label>();
            const tabRef = createRef<Gtk.Box>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <Notebook.Page>
                        <Notebook.PageTab>
                            <GtkBox ref={tabRef} spacing={0} orientation={Gtk.Orientation.HORIZONTAL}>
                                <GtkLabel label="Custom Tab" />
                            </GtkBox>
                        </Notebook.PageTab>
                        <GtkLabel ref={contentRef} label="Content" />
                    </Notebook.Page>
                </GtkNotebook>,
                { wrapper: false },
            );

            expect(notebookRef.current?.getNPages()).toBe(1);
            const tabLabel = notebookRef.current?.getTabLabel(contentRef.current as Gtk.Widget);
            expect(tabLabel?.equals(tabRef.current)).toBe(true);
        });

        it("uses custom tab when both label prop and PageTab are provided", async () => {
            const notebookRef = createRef<Gtk.Notebook>();
            const contentRef = createRef<Gtk.Label>();
            const tabRef = createRef<Gtk.Label>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <Notebook.Page label="Ignored Label">
                        <Notebook.PageTab>
                            <GtkLabel ref={tabRef} label="Custom Tab Wins" />
                        </Notebook.PageTab>
                        <GtkLabel ref={contentRef} label="Content" />
                    </Notebook.Page>
                </GtkNotebook>,
                { wrapper: false },
            );

            const tabLabel = notebookRef.current?.getTabLabel(contentRef.current as Gtk.Widget);
            expect(tabLabel?.equals(tabRef.current)).toBe(true);
            expect((tabLabel as Gtk.Label)?.getLabel()).toBe("Custom Tab Wins");
        });

        it("updates tab widget dynamically", async () => {
            const notebookRef = createRef<Gtk.Notebook>();
            const contentRef = createRef<Gtk.Label>();
            const tabRef = createRef<Gtk.Label>();

            function App({ tabText }: { tabText: string }) {
                return (
                    <GtkNotebook ref={notebookRef}>
                        <Notebook.Page>
                            <Notebook.PageTab>
                                <GtkLabel ref={tabRef} label={tabText} />
                            </Notebook.PageTab>
                            <GtkLabel ref={contentRef} label="Content" />
                        </Notebook.Page>
                    </GtkNotebook>
                );
            }

            await render(<App tabText="Initial" />, { wrapper: false });
            let tabLabel = notebookRef.current?.getTabLabel(contentRef.current as Gtk.Widget) as Gtk.Label;
            expect(tabLabel?.getLabel()).toBe("Initial");

            await render(<App tabText="Updated" />, { wrapper: false });
            tabLabel = notebookRef.current?.getTabLabel(contentRef.current as Gtk.Widget) as Gtk.Label;
            expect(tabLabel?.getLabel()).toBe("Updated");
        });

        it("works with multiple pages with custom tabs", async () => {
            const notebookRef = createRef<Gtk.Notebook>();
            const content1Ref = createRef<Gtk.Label>();
            const content2Ref = createRef<Gtk.Label>();
            const tab1Ref = createRef<Gtk.Label>();
            const tab2Ref = createRef<Gtk.Label>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <Notebook.Page>
                        <Notebook.PageTab>
                            <GtkLabel ref={tab1Ref} label="Tab 1" />
                        </Notebook.PageTab>
                        <GtkLabel ref={content1Ref} label="Content 1" />
                    </Notebook.Page>
                    <Notebook.Page>
                        <Notebook.PageTab>
                            <GtkLabel ref={tab2Ref} label="Tab 2" />
                        </Notebook.PageTab>
                        <GtkLabel ref={content2Ref} label="Content 2" />
                    </Notebook.Page>
                </GtkNotebook>,
                { wrapper: false },
            );

            expect(notebookRef.current?.getNPages()).toBe(2);
            expect(notebookRef.current?.getTabLabel(content1Ref.current as Gtk.Widget)?.equals(tab1Ref.current)).toBe(
                true,
            );
            expect(notebookRef.current?.getTabLabel(content2Ref.current as Gtk.Widget)?.equals(tab2Ref.current)).toBe(
                true,
            );
        });

        it("mixes pages with text labels and custom tabs", async () => {
            const notebookRef = createRef<Gtk.Notebook>();
            const content1Ref = createRef<Gtk.Label>();
            const content2Ref = createRef<Gtk.Label>();
            const customTabRef = createRef<Gtk.Box>();

            await render(
                <GtkNotebook ref={notebookRef}>
                    <Notebook.Page label="Text Tab">
                        <GtkLabel ref={content1Ref} label="Content 1" />
                    </Notebook.Page>
                    <Notebook.Page>
                        <Notebook.PageTab>
                            <GtkBox ref={customTabRef} spacing={0} orientation={Gtk.Orientation.HORIZONTAL}>
                                <GtkLabel label="Custom" />
                            </GtkBox>
                        </Notebook.PageTab>
                        <GtkLabel ref={content2Ref} label="Content 2" />
                    </Notebook.Page>
                </GtkNotebook>,
                { wrapper: false },
            );

            expect(notebookRef.current?.getNPages()).toBe(2);

            const tab1 = notebookRef.current?.getTabLabel(content1Ref.current as Gtk.Widget) as Gtk.Label;
            expect(tab1?.getLabel()).toBe("Text Tab");

            const tab2 = notebookRef.current?.getTabLabel(content2Ref.current as Gtk.Widget);
            expect(tab2?.equals(customTabRef.current)).toBe(true);
        });
    });
});
