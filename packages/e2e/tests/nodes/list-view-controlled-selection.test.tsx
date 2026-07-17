import { ListView } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkLabel, GtkScrolledWindow } from "@gtkx/jsx/gtk";
import { render, screen, userEvent, waitFor } from "@gtkx/testing";
import { createRef, type RefObject, useState } from "react";
import { describe, expect, it } from "vitest";

type Task = { id: string; title: string };

const TASKS: Task[] = [
    { id: "a", title: "Buy milk" },
    { id: "b", title: "Walk dog" },
    { id: "c", title: "Write docs" },
];

function SelectScreen({ listRef }: { listRef: RefObject<Gtk.ListView | null> }) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const visible = TASKS.filter(() => true);
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL}>
            <GtkLabel>{`${selectedIds.length} selected`}</GtkLabel>
            <GtkButton label="Select All" onClicked={() => setSelectedIds(visible.map((task) => task.id))} />
            <GtkScrolledWindow vexpand minContentHeight={300}>
                <ListView<Task>
                    ref={listRef}
                    items={visible.map((task) => ({ id: task.id, value: task }))}
                    selectionMode={Gtk.SelectionMode.MULTIPLE}
                    selectedIds={selectedIds}
                    onSelectionChanged={setSelectedIds}
                    estimatedItemHeight={56}
                    renderItem={({ item }) => <GtkLabel>{item.title}</GtkLabel>}
                />
            </GtkScrolledWindow>
        </GtkBox>
    );
}

describe("render - ListView - controlled multi-selection feedback", () => {
    it("updates parent state when a row is selected", async () => {
        const listRef = createRef<Gtk.ListView>();
        await render(<SelectScreen listRef={listRef} />);

        await userEvent.selectOptions(listRef.current as Gtk.ListView, 0);

        await waitFor(() => {
            expect(screen.queryAllByText("1 selected")).toHaveLength(1);
        });
    });

    it("selects every row when Select All updates selectedIds", async () => {
        const listRef = createRef<Gtk.ListView>();
        await render(<SelectScreen listRef={listRef} />);

        const selectAll = screen.getByText("Select All");
        await userEvent.click(selectAll);

        await waitFor(() => {
            expect(screen.queryAllByText("3 selected")).toHaveLength(1);
            const model = (listRef.current as Gtk.ListView).getModel() as Gtk.MultiSelection;
            expect(model.getSelection().getSize()).toBe(3n);
        });
    });
});
