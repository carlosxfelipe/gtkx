---
description: "Each task is an AdwActionRow with checkbox, star, and delete controls, plus drag-and-drop reordering built from GTK4 event controllers."
---

# Task Rows and Drag-to-Reorder

Each task is one `AdwActionRow` in the boxed list, carrying a checkbox, a star, a delete button, and the drag controllers that reorder it.

## The row

Here is the shell, from `components/task-row.tsx`:

```tsx
import * as Gdk from "@gtkx/gi/gdk";
import * as GObject from "@gtkx/gi/gobject";
import * as Gtk from "@gtkx/gi/gtk";
import { AdwActionRow } from "@gtkx/jsx/adw";
import { GtkButton, GtkCheckButton, GtkDragSource, GtkDropTarget, GtkToggleButton } from "@gtkx/jsx/gtk";
import { escapeMarkup, formatDue } from "../format.js";
import type { Task } from "../types.js";

// ... TaskRowHandlers and TaskRowProps

export const TaskRow = ({
    task,
    reorderable,
    onToggleDone,
    onToggleImportant,
    onDelete,
    onOpen,
    onReorder,
}: TaskRowProps) => {
    const title = task.done ? `<s>${escapeMarkup(task.title)}</s>` : escapeMarkup(task.title);

    return (
        <AdwActionRow
            title={title}
            useMarkup
            subtitle={formatDue(task.due) ?? undefined}
            activatable
            onActivated={() => onOpen(task.id)}
            // prefix / suffix / controllers below
        />
    );
};
```

### Title and subtitle

The strikethrough on a completed task comes from Pango markup, GTK4's inline text-formatting syntax, which the row's title label parses. `escapeMarkup` neutralizes the markup-significant characters in the user-supplied title before it is wrapped in the trusted `<s>` tags:

```ts
export const escapeMarkup = (value: string): string =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
```

`formatDue` returns `string | null`, so `?? undefined` leaves a task without a due date with no subtitle line.

### The prefix checkbox

```tsx
prefix={
    <GtkCheckButton
        valign={Gtk.Align.CENTER}
        active={task.done}
        accessibleLabel="Mark complete"
        onToggled={(self) => onToggleDone(task.id, self.active)}
    />
}
```

The handler reads `self.active`, the checkbox's state after the toggle.

### The suffix controls

```tsx
suffix={
    <>
        <GtkToggleButton
            valign={Gtk.Align.CENTER}
            iconName={task.important ? "starred-symbolic" : "non-starred-symbolic"}
            active={task.important}
            accessibleLabel="Toggle important"
            cssClasses={["flat"]}
            onToggled={(self) => onToggleImportant(task.id, self.active)}
        />
        <GtkButton
            valign={Gtk.Align.CENTER}
            iconName="user-trash-symbolic"
            accessibleLabel="Delete task"
            cssClasses={["flat"]}
            onClicked={() => onDelete(task)}
        />
    </>
}
```

The star swaps its icon between `starred-symbolic` and `non-starred-symbolic`. Delete hands the whole `task` object to `onDelete`, which moves it to Trash or asks for confirmation ([Feedback and Dialogs](/tutorial/feedback-and-dialogs)).

## Drag to reorder

### The drag source and drop target

Every row carries a `GtkDragSource` and a `GtkDropTarget`, mounted only while `reorderable` is true:

```tsx
controllers={
    reorderable ? (
        <>
            <GtkDragSource
                actions={Gdk.DragAction.MOVE}
                onPrepare={(x, y, self) => {
                    const row = self.getWidget();
                    if (row) self.setIcon(Gtk.WidgetPaintable.new(row), Math.round(x), Math.round(y));
                    return Gdk.ContentProvider.newForValue(
                        GObject.buildValue(GObject.TYPE_STRING, (value) => value.setString(task.id)),
                    );
                }}
            />
            <GtkDropTarget
                actions={Gdk.DragAction.MOVE}
                types={[GObject.TYPE_STRING]}
                onDrop={(value) => {
                    const draggedId = value.getString();
                    if (draggedId) onReorder(draggedId, task.id);
                    return true;
                }}
            />
        </>
    ) : undefined
}
```

The payload is the task's id boxed into a string-typed `GObject.Value`, and returning `true` from `onDrop` reports the drop as handled.

### The drag icon

`onPrepare` also sets what the pointer carries during the drag: `Gtk.WidgetPaintable.new(row)` makes the ghost a picture of the row itself. The `x` and `y` that `prepare` hands you are the point inside the row where the drag started, and passing them to `setIcon` as the hotspot pins the ghost to the cursor exactly where you grabbed it.

::: warning
`setIcon` takes 32-bit integer hotspot coordinates while pointer coordinates arrive as GTK4 doubles, so the raw `x` and `y` throw `Value 181.5 is out of range for i32`. Round any pointer coordinate you feed into an integer-typed GTK4 setter.
:::

`onReorder` calls the hook's [`reorder`](/tutorial/data-and-persistence#the-hook-state-plus-every-mutation), which re-splices the array and re-derives every `position`. Because the rows are keyed by `task.id`, the reconciler repositions the existing widgets instead of rebuilding them.

### Enabling drag

`app.tsx` computes `reorderable` from the current view:

```tsx
const reorderable =
    sortOrder === "manual" && !searchQuery && !(selection.kind === "smart" && selection.view === "trash");
```

It gates the `controllers` slot, so rows under a sort order, a search filter, or Trash mount no drag machinery.

## Next

Continue to [Animations](/tutorial/animations).
