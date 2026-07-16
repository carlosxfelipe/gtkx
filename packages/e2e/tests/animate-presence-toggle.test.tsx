import { AnimatePresence, animated } from "@gtkx/animate";
import * as Gtk from "@gtkx/gi/gtk";
import { AdwActionRow, AdwClamp, AdwEntryRow } from "@gtkx/jsx/adw";
import { GtkBox, GtkButton, GtkListBox, GtkScrolledWindow } from "@gtkx/jsx/gtk";
import { render as baseRender, screen, userEvent } from "@gtkx/testing";
import { useState } from "react";
import { describe, expect, it } from "vitest";

let statusWidget: Gtk.Widget | null = null;
let rowWidget: Gtk.Widget | null = null;

const OPEN_TASKS = ["Water the plants"];

const App = () => {
    const [filter, setFilter] = useState("open");
    const tasks = filter === "open" ? OPEN_TASKS : [];
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} vexpand>
            <GtkBox>
                <GtkButton label="Open" onClicked={() => setFilter("open")} />
                <GtkButton label="Done" onClicked={() => setFilter("done")} />
            </GtkBox>
            <GtkScrolledWindow vexpand>
                <AdwClamp maximumSize={640}>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                        <GtkListBox selectionMode={Gtk.SelectionMode.NONE}>
                            <AdwEntryRow title="Add a task…" />
                            {tasks.map((task) => (
                                <AdwActionRow
                                    key={task}
                                    title={task}
                                    ref={(widget: Gtk.Widget | null) => {
                                        if (widget) rowWidget = widget;
                                    }}
                                />
                            ))}
                        </GtkListBox>
                        <AnimatePresence initial={false}>
                            {tasks.length === 0 ? (
                                <animated.AdwStatusPage
                                    key="empty"
                                    cssClasses={["compact"]}
                                    iconName="x-office-calendar-symbolic"
                                    title="Nothing Due Today"
                                    description="Tasks due today appear here"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, transition: { duration: 0 } }}
                                    transition={{ duration: 0.2 }}
                                    ref={(widget: Gtk.Widget | null) => {
                                        if (widget) statusWidget = widget;
                                    }}
                                />
                            ) : null}
                        </AnimatePresence>
                    </GtkBox>
                </AdwClamp>
            </GtkScrolledWindow>
        </GtkBox>
    );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isLive = (widget: Gtk.Widget | null): boolean => widget !== null && widget.parent !== null && widget.getMapped();

describe("AnimatePresence (rapid toggling)", () => {
    it("never maps an instant-exit child and its replacement content at the same time", async () => {
        const violations: string[] = [];
        let seed = 42;
        const nextGap = (): number => {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            return seed % 90;
        };

        await baseRender(<App />, { animations: true });
        const openButton = await screen.findByText("Open");
        const doneButton = await screen.findByText("Done");

        let stop = false;
        const sampler = (async () => {
            while (!stop) {
                if (isLive(statusWidget) && isLive(rowWidget)) {
                    violations.push(`overlap: status and row mapped together (${violations.length})`);
                    await sleep(20);
                } else {
                    await sleep(1);
                }
            }
        })();

        for (let cycle = 0; cycle < 60 && violations.length < 5; cycle += 1) {
            await userEvent.click(doneButton);
            await sleep(nextGap());
            await userEvent.click(openButton);
            await sleep(nextGap());
        }

        stop = true;
        await sampler;

        expect(violations).toEqual([]);
    });
});
