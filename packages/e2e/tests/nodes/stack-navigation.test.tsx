import type * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { AdwViewStack, AdwViewSwitcher, GtkBox, GtkStack, GtkStackSidebar, GtkStackSwitcher } from "@gtkx/react";
import { render, screen } from "@gtkx/testing";
import { describe, expect, it } from "vitest";

describe("render - StackNavigation auto-wire", () => {
    it("binds GtkStackSidebar to a sibling GtkStack without an explicit prop", async () => {
        await render(
            <GtkBox>
                <GtkStackSidebar name="sidebar" />
                <GtkStack name="stack">
                    <GtkStack.Page id="a" title="A">
                        A
                    </GtkStack.Page>
                </GtkStack>
            </GtkBox>,
        );

        const sidebar = (await screen.findByName("sidebar")) as Gtk.StackSidebar;
        const stack = (await screen.findByName("stack")) as Gtk.Stack;
        expect(sidebar.getStack()).toBe(stack);
    });

    it("binds GtkStackSwitcher to a sibling GtkStack without an explicit prop", async () => {
        await render(
            <GtkBox>
                <GtkStackSwitcher name="switcher" />
                <GtkStack name="stack">
                    <GtkStack.Page id="a" title="A">
                        A
                    </GtkStack.Page>
                </GtkStack>
            </GtkBox>,
        );

        const switcher = (await screen.findByName("switcher")) as Gtk.StackSwitcher;
        const stack = (await screen.findByName("stack")) as Gtk.Stack;
        expect(switcher.getStack()).toBe(stack);
    });

    it("auto-wires regardless of declaration order", async () => {
        await render(
            <GtkBox>
                <GtkStack name="stack">
                    <GtkStack.Page id="a" title="A">
                        A
                    </GtkStack.Page>
                </GtkStack>
                <GtkStackSwitcher name="switcher" />
            </GtkBox>,
        );

        const switcher = (await screen.findByName("switcher")) as Gtk.StackSwitcher;
        const stack = (await screen.findByName("stack")) as Gtk.Stack;
        expect(switcher.getStack()).toBe(stack);
    });

    it("binds AdwViewSwitcher to a sibling AdwViewStack", async () => {
        await render(
            <GtkBox>
                <AdwViewSwitcher name="switcher" />
                <AdwViewStack name="stack">
                    <AdwViewStack.Page id="a" title="A">
                        A
                    </AdwViewStack.Page>
                </AdwViewStack>
            </GtkBox>,
        );

        const switcher = (await screen.findByName("switcher")) as Adw.ViewSwitcher;
        const stack = (await screen.findByName("stack")) as Adw.ViewStack;
        expect(switcher.getStack()).toBe(stack);
    });
});

describe("render - StackNavigation sibling replacement", () => {
    it("rebinds when the sibling stack is replaced by a fresh instance", async () => {
        function App({ stackKey }: { stackKey: string }) {
            return (
                <GtkBox>
                    <GtkStackSwitcher name="switcher" />
                    <GtkStack key={stackKey} name="stack">
                        <GtkStack.Page id={stackKey} title="A">
                            A
                        </GtkStack.Page>
                    </GtkStack>
                </GtkBox>
            );
        }

        const { rerender } = await render(<App stackKey="a" />);
        const switcher = (await screen.findByName("switcher")) as Gtk.StackSwitcher;
        const firstStack = (await screen.findByName("stack")) as Gtk.Stack;
        expect(switcher.getStack()).toBe(firstStack);

        await rerender(<App stackKey="b" />);
        const secondStack = (await screen.findByName("stack")) as Gtk.Stack;
        expect(secondStack).not.toBe(firstStack);
        expect(switcher.getStack()).toBe(secondStack);
    });
});

describe("render - StackNavigation explicit prop", () => {
    it("honours an explicit stack prop and ignores siblings on first render", async () => {
        const explicitStack = Gtk.Stack.new();

        await render(
            <GtkBox>
                <GtkStackSwitcher name="switcher" stack={explicitStack} />
                <GtkStack name="ignored">
                    <GtkStack.Page id="ignored" title="Ignored">
                        Ignored
                    </GtkStack.Page>
                </GtkStack>
            </GtkBox>,
        );

        const switcher = (await screen.findByName("switcher")) as Gtk.StackSwitcher;
        const ignored = (await screen.findByName("ignored")) as Gtk.Stack;
        expect(switcher.getStack()).toBe(explicitStack);
        expect(switcher.getStack()).not.toBe(ignored);
    });

    it("disconnects GtkStackSwitcher when stack={null} is passed explicitly", async () => {
        await render(
            <GtkBox>
                <GtkStackSwitcher name="switcher" stack={null} />
                <GtkStack name="stack">
                    <GtkStack.Page id="a" title="A">
                        A
                    </GtkStack.Page>
                </GtkStack>
            </GtkBox>,
        );

        const switcher = (await screen.findByName("switcher")) as Gtk.StackSwitcher;
        expect(switcher.getStack()).toBeNull();
    });
});

describe("render - StackNavigation transitions", () => {
    it("switches from explicit prop to sibling auto-wire when the prop is removed", async () => {
        const explicitStack = Gtk.Stack.new();

        function App({ useExplicit }: { useExplicit: boolean }) {
            return (
                <GtkBox>
                    <GtkStackSwitcher name="switcher" stack={useExplicit ? explicitStack : undefined} />
                    <GtkStack name="sibling">
                        <GtkStack.Page id="a" title="A">
                            A
                        </GtkStack.Page>
                    </GtkStack>
                </GtkBox>
            );
        }

        const { rerender } = await render(<App useExplicit={true} />);
        const switcher = (await screen.findByName("switcher")) as Gtk.StackSwitcher;
        expect(switcher.getStack()).toBe(explicitStack);

        await rerender(<App useExplicit={false} />);
        const sibling = (await screen.findByName("sibling")) as Gtk.Stack;
        expect(switcher.getStack()).toBe(sibling);
    });
});

describe("render - StackNavigation invariants", () => {
    it("throws when no sibling stack is present and no explicit prop is given", async () => {
        await expect(
            render(
                <GtkBox>
                    <GtkStackSidebar />
                </GtkBox>,
            ),
        ).rejects.toThrow(/GtkStackSidebar.*no sibling.*GtkStack/);
    });

    it("throws when multiple sibling stacks are present and no explicit prop is given", async () => {
        await expect(
            render(
                <GtkBox>
                    <GtkStackSwitcher />
                    <GtkStack>
                        <GtkStack.Page id="a" title="A">
                            A
                        </GtkStack.Page>
                    </GtkStack>
                    <GtkStack>
                        <GtkStack.Page id="b" title="B">
                            B
                        </GtkStack.Page>
                    </GtkStack>
                </GtkBox>,
            ),
        ).rejects.toThrow(/GtkStackSwitcher.*2 sibling.*GtkStack/);
    });

    it("throws when only a different-family sibling stack is present", async () => {
        await expect(
            render(
                <GtkBox>
                    <GtkStackSwitcher />
                    <AdwViewStack>
                        <AdwViewStack.Page id="a" title="A">
                            A
                        </AdwViewStack.Page>
                    </AdwViewStack>
                </GtkBox>,
            ),
        ).rejects.toThrow(/GtkStackSwitcher.*no sibling.*GtkStack/);
    });

    it("rejects rerender when a sibling-replacement leaves multiple matching stacks", async () => {
        function App({ stackKeys }: { stackKeys: readonly string[] }) {
            return (
                <GtkBox>
                    <GtkStackSwitcher />
                    {stackKeys.map((key) => (
                        <GtkStack key={key}>
                            <GtkStack.Page id={key} title={key}>
                                {key}
                            </GtkStack.Page>
                        </GtkStack>
                    ))}
                </GtkBox>
            );
        }

        const { rerender } = await render(<App stackKeys={["a"]} />);
        await expect(rerender(<App stackKeys={["b", "c"]} />)).rejects.toThrow(
            /GtkStackSwitcher.*2 sibling.*GtkStack/,
        );
    });
});
