import type * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Label, Stack } from "../../src/index.js";
import { flushMicrotasks, render } from "../setup.js";

describe("render - Stack", () => {
    describe("Stack.Root", () => {
        it("creates Stack widget", async () => {
            const ref = createRef<Gtk.Stack>();

            render(<Stack.Root ref={ref} />);
            await flushMicrotasks();

            expect(ref.current).not.toBeNull();
        });
    });

    describe("Stack.Page", () => {
        it("adds named page", async () => {
            const stackRef = createRef<Gtk.Stack>();

            render(
                <Stack.Root ref={stackRef}>
                    <Stack.Page name="page1">
                        <Label label="Page 1" />
                    </Stack.Page>
                </Stack.Root>,
            );
            await flushMicrotasks();

            expect(stackRef.current?.getChildByName("page1")).not.toBeNull();
        });

        it("adds titled page", async () => {
            const stackRef = createRef<Gtk.Stack>();

            render(
                <Stack.Root ref={stackRef}>
                    <Stack.Page title="Page Title" name="titled">
                        <Label label="Titled Content" />
                    </Stack.Page>
                </Stack.Root>,
            );
            await flushMicrotasks();

            const page = stackRef.current?.getPage(stackRef.current.getChildByName("titled") as Gtk.Widget);
            expect(page?.getTitle()).toBe("Page Title");
        });

        it("adds child page (no name/title)", async () => {
            const stackRef = createRef<Gtk.Stack>();

            render(
                <Stack.Root ref={stackRef}>
                    <Stack.Page>
                        <Label label="Unnamed Page" />
                    </Stack.Page>
                </Stack.Root>,
            );
            await flushMicrotasks();

            expect(stackRef.current?.getFirstChild()).not.toBeNull();
        });

        it("sets page properties (iconName, needsAttention, etc.)", async () => {
            const stackRef = createRef<Gtk.Stack>();

            render(
                <Stack.Root ref={stackRef}>
                    <Stack.Page name="props-test" iconName="dialog-information" needsAttention={true}>
                        <Label label="With Props" />
                    </Stack.Page>
                </Stack.Root>,
            );
            await flushMicrotasks();

            const child = stackRef.current?.getChildByName("props-test");
            const page = stackRef.current?.getPage(child as Gtk.Widget);
            expect(page?.getIconName()).toBe("dialog-information");
            expect(page?.getNeedsAttention()).toBe(true);
        });
    });

    describe("page management", () => {
        it("inserts page before existing page", async () => {
            const stackRef = createRef<Gtk.Stack>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <Stack.Root ref={stackRef}>
                        {pages.map((name) => (
                            <Stack.Page key={name} name={name}>
                                <Label label={name} />
                            </Stack.Page>
                        ))}
                    </Stack.Root>
                );
            }

            render(<App pages={["first", "last"]} />);
            await flushMicrotasks();

            render(<App pages={["first", "middle", "last"]} />);
            await flushMicrotasks();

            expect(stackRef.current?.getChildByName("first")).not.toBeNull();
            expect(stackRef.current?.getChildByName("middle")).not.toBeNull();
            expect(stackRef.current?.getChildByName("last")).not.toBeNull();
        });

        it("removes page", async () => {
            const stackRef = createRef<Gtk.Stack>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <Stack.Root ref={stackRef}>
                        {pages.map((name) => (
                            <Stack.Page key={name} name={name}>
                                <Label label={name} />
                            </Stack.Page>
                        ))}
                    </Stack.Root>
                );
            }

            render(<App pages={["a", "b", "c"]} />);
            await flushMicrotasks();

            render(<App pages={["a", "c"]} />);
            await flushMicrotasks();

            expect(stackRef.current?.getChildByName("a")).not.toBeNull();
            expect(stackRef.current?.getChildByName("b")).toBeNull();
            expect(stackRef.current?.getChildByName("c")).not.toBeNull();
        });

        it("updates page properties when props change", async () => {
            const stackRef = createRef<Gtk.Stack>();

            function App({ iconName }: { iconName: string }) {
                return (
                    <Stack.Root ref={stackRef}>
                        <Stack.Page name="dynamic" iconName={iconName}>
                            <Label label="Dynamic" />
                        </Stack.Page>
                    </Stack.Root>
                );
            }

            render(<App iconName="dialog-information" />);
            await flushMicrotasks();

            const child = stackRef.current?.getChildByName("dynamic");
            let page = stackRef.current?.getPage(child as Gtk.Widget);
            expect(page?.getIconName()).toBe("dialog-information");

            render(<App iconName="dialog-warning" />);
            await flushMicrotasks();

            page = stackRef.current?.getPage(child as Gtk.Widget);
            expect(page?.getIconName()).toBe("dialog-warning");
        });
    });

    describe("visibleChild", () => {
        it("sets visible child by name", async () => {
            const stackRef = createRef<Gtk.Stack>();

            render(
                <Stack.Root ref={stackRef} visibleChildName="page2">
                    <Stack.Page name="page1">
                        <Label label="Page 1" />
                    </Stack.Page>
                    <Stack.Page name="page2">
                        <Label label="Page 2" />
                    </Stack.Page>
                </Stack.Root>,
            );
            await flushMicrotasks();

            expect(stackRef.current?.getVisibleChildName()).toBe("page2");
        });

        it("handles pending visible child before pages added", async () => {
            const stackRef = createRef<Gtk.Stack>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <Stack.Root ref={stackRef} visibleChildName="target">
                        {pages.map((name) => (
                            <Stack.Page key={name} name={name}>
                                <Label label={name} />
                            </Stack.Page>
                        ))}
                    </Stack.Root>
                );
            }

            render(<App pages={["other"]} />);
            await flushMicrotasks();

            render(<App pages={["other", "target"]} />);
            await flushMicrotasks();

            expect(stackRef.current?.getVisibleChildName()).toBe("target");
        });
    });
});
