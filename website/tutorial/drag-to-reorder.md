---
description: "Reorder rows by dragging, and only where a manual order means something."
---

# Dragging Tasks Into Order

The app now remembers a preferred sort order, chosen in the dialog you built in [Preferences and the System Theme](/tutorial/preferences-and-theming). One of the choices is Manual, and right now Manual means nothing more than the order tasks happened to be created in. This chapter makes it mean what the reader of that menu item expects: the order you put them in, by dragging a row where you want it.

## The reorder action

Every task already carries a `position`, and the manual comparator sorts on it. What is missing is something that changes it. Moving one task in front of another is easier to express on an array than on a set of numbers: pull the dragged task out, splice it back in at the target's index, then rewrite every position to its new array index. Positions stay dense (0, 1, 2, and so on) with no gaps to run out of and no fractional midpoints to accumulate, and the comparator stays a subtraction.

Add the action to the tasks slice, in `src/store/tasks.ts`:

```ts
export type TasksSlice = {
    // ...
    deleteForever: (id: string) => void;
    reorder: (draggedId: string, targetId: string) => void;
};

export const createTasksSlice: StateCreator<Store, Mutators, [], TasksSlice> = (set) => ({
    // ...
    reorder: (draggedId, targetId) =>
        set((state) => {
            const tasks = [...state.tasks];
            const from = tasks.findIndex((task) => task.id === draggedId);
            const to = tasks.findIndex((task) => task.id === targetId);
            if (from < 0 || to < 0 || from === to) return {};
            const [moved] = tasks.splice(from, 1);
            if (moved === undefined) return {};
            tasks.splice(to, 0, moved);
            return { tasks: tasks.map((task, index) => ({ ...task, position: index })) };
        }),
});
```

Returning an empty object from `set` is a no-op update, which is what you want when one of the ids is not in the array or a row is dropped on itself. Because `reorder` lives in the persisted slice, the new order is written to disk by the same middleware that saved everything else in [Saving Tasks Between Runs](/tutorial/saving-to-disk).

## Event controllers

The store is ready. The row is not: nothing in it responds to a press-and-drag.

GTK4 does not put input handling on the widget. Pointer, keyboard, gesture, and drag handling all live in separate objects called event controllers, which you attach to a widget; the widget itself only draws. GTKX exposes them through a `controllers` slot, the same shape as the shortcut controller you mounted on the window in [Menus, Accelerators, and Shortcuts](/tutorial/actions-menus-shortcuts). Anything you put in that slot is attached to the widget rather than packed inside it.

Two controllers cover a reorder. `GtkDragSource` makes a widget something you can pick up. `GtkDropTarget` makes a widget something you can let go over. Each row needs both, because any row can be dragged and any row can be dropped on.

## Making a row draggable

In `src/components/task-row.tsx`, add the drag source:

```tsx
import * as Gdk from "@gtkx/gi/gdk";
import * as GObject from "@gtkx/gi/gobject";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkButton, GtkCheckButton, GtkDragSource, GtkToggleButton } from "@gtkx/jsx/gtk";
// ...

export const TaskRow = ({ task }: { task: Task }) => {
    // ...
    const reorder = useStore((state) => state.reorder);

    return (
        <AdwActionRow
            // ...
            controllers={
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
            }
        />
    );
};
```

`actions={Gdk.DragAction.MOVE}` says this drag moves its payload rather than copying or linking it, which is what a cursor shape and a drop target both check.

`onPrepare` runs once, when GTK4 decides the pointer has travelled far enough to be a drag rather than a click. Its job is to hand back the payload. A drag payload is a `Gdk.ContentProvider`, and the value inside it is a `GValue`, GObject's boxed-value type; `GObject.buildValue` builds one for you, taking the type to build and a callback that fills it. Here the payload is the task's id as a string, which is all the drop side needs to look the task up.

The same handler is a good place to give the drag a picture. `self.getWidget()` is the widget the controller is attached to, this row, and `Gtk.WidgetPaintable.new(row)` turns it into something drawable, so the ghost that follows your pointer is a live rendering of the row itself. The `x` and `y` you are handed are the point inside the row where the drag started; passing them as the hotspot pins the ghost to the cursor at exactly the spot you grabbed, instead of snapping the row's corner under your pointer.

::: warning
`setIcon` takes 32-bit integer hotspot coordinates while pointer coordinates arrive as GTK4 doubles, so the raw `x` and `y` throw `Value 181.5 is out of range for i32`. Round any pointer coordinate you feed into an integer-typed GTK4 setter.
:::

`getWidget()` is nullable, which is why the icon is set behind an `if`. Returning the content provider is unconditional: a drag with no payload is a drag nothing can accept.

## Accepting a drop

A source with no target produces a ghost that follows the pointer and then springs back. Add the other half, still in `src/components/task-row.tsx`:

```tsx
import { GtkButton, GtkCheckButton, GtkDragSource, GtkDropTarget, GtkToggleButton } from "@gtkx/jsx/gtk";
// ...

            controllers={
                <>
                    <GtkDragSource
                        // ...
                    />
                    <GtkDropTarget
                        actions={Gdk.DragAction.MOVE}
                        types={[GObject.TYPE_STRING]}
                        onDrop={(value) => {
                            const draggedId = value.getString();
                            if (draggedId) reorder(draggedId, task.id);
                            return true;
                        }}
                    />
                </>
            }
```

`types` declares what this target will accept. A drag carrying anything other than a string never highlights this row and never reaches `onDrop`. Inside the handler, `value` is the `GValue` the source built, so `getString()` gives back the dragged task's id, and the target's own `task.id` is the destination. Returning `true` reports the drop as handled; returning `false` tells GTK4 the drop failed, and the drag animates back to where it came from.

The visible result is immediate, and that is worth a moment. Every row is keyed by its task id, as it has been since [Showing a List of Tasks](/tutorial/a-list-of-tasks). When the sorted array comes back in a different order, the reconciler recognizes the same keys and repositions the existing `AdwActionRow` widgets rather than destroying and rebuilding them, so a drop moves rows instead of rebuilding a list.

## When dragging makes sense

Dragging a row to a new position only means something when position is what the list is sorted by. Under Title or Due Date the drop would rewrite positions no one can see, and in Trash the order of things you have thrown away is not worth arranging. A search result is the same problem: the list on screen is a subset, so dropping between two visible rows says nothing about where the task belongs among the ones filtered out.

That is one boolean, and it belongs next to the other reading logic. Add it to `src/store/selectors.ts`:

```ts
export const isReorderable = (selection: Selection, query: string, sortOrder: SortOrder): boolean =>
    sortOrder === "manual" && query === "" && !(selection.kind === "smart" && selection.view === "trash");
```

Now gate the whole slot, in `src/components/task-row.tsx`:

```tsx
import { useSetting } from "@gtkx/react";
import schema from "#data/com.gtkx.tutorial.gschema.xml";
import { isReorderable } from "../store/selectors.js";
// ...

    const selection = useStore((state) => state.selection);
    const searchQuery = useStore((state) => state.searchQuery);
    const [sortOrder] = useSetting(schema, "sort-order");
    const reorderable = isReorderable(selection, searchQuery, sortOrder);

    // ...
            controllers={
                reorderable ? (
                    <>
                        {/* ... */}
                    </>
                ) : undefined
            }
```

A slot given `undefined` mounts nothing at all. A non-reorderable row therefore has no drag source and no drop target attached to it, rather than controllers that accept a drag and then decline it. Switching the sort order in Preferences changes `sortOrder`, the rows re-render, and the controllers are removed from every row.

::: details Why read the setting in the row and not pass it down?
`useSetting` subscribes to the GSettings key, so every row that calls it re-renders when the key changes, without the list having to thread a prop through. The cost is one subscription per row, which is fine at this scale; the benefit is that `TaskRow` needs nothing from its parent except the task. `TaskList` reads the same key independently for its own sorting, and the two stay in agreement because they are reading one value from one place.
:::

Here is the finished row, `src/components/task-row.tsx`:

```tsx
import * as Gdk from "@gtkx/gi/gdk";
import * as GObject from "@gtkx/gi/gobject";
import * as Gtk from "@gtkx/gi/gtk";
import { AdwActionRow } from "@gtkx/jsx/adw";
import { GtkButton, GtkCheckButton, GtkDragSource, GtkDropTarget, GtkToggleButton } from "@gtkx/jsx/gtk";
import { useSetting } from "@gtkx/react";
import schema from "#data/com.gtkx.tutorial.gschema.xml";
import { escapeMarkup, formatDue } from "../format.js";
import { useStore } from "../store/index.js";
import { isReorderable } from "../store/selectors.js";
import type { Task } from "../types.js";
import { requestDeleteTask } from "./dialogs.js";

export const TaskRow = ({ task }: { task: Task }) => {
    const setDone = useStore((state) => state.setDone);
    const setImportant = useStore((state) => state.setImportant);
    const openTask = useStore((state) => state.openTask);
    const reorder = useStore((state) => state.reorder);
    const selection = useStore((state) => state.selection);
    const searchQuery = useStore((state) => state.searchQuery);
    const [sortOrder] = useSetting(schema, "sort-order");
    const reorderable = isReorderable(selection, searchQuery, sortOrder);
    const title = task.done ? `<s>${escapeMarkup(task.title)}</s>` : escapeMarkup(task.title);

    return (
        <AdwActionRow
            title={title}
            useMarkup
            subtitle={formatDue(task.due) ?? undefined}
            activatable
            onActivated={() => openTask(task.id)}
            prefix={
                <GtkCheckButton
                    valign={Gtk.Align.CENTER}
                    active={task.done}
                    accessibleLabel="Mark complete"
                    onToggled={(self) => setDone(task.id, self.active)}
                />
            }
            suffix={
                <>
                    <GtkToggleButton
                        valign={Gtk.Align.CENTER}
                        iconName={task.important ? "starred-symbolic" : "non-starred-symbolic"}
                        active={task.important}
                        accessibleLabel="Toggle important"
                        cssClasses={["flat"]}
                        onToggled={(self) => setImportant(task.id, self.active)}
                    />
                    <GtkButton
                        valign={Gtk.Align.CENTER}
                        iconName="user-trash-symbolic"
                        accessibleLabel="Delete task"
                        cssClasses={["flat"]}
                        onClicked={() => requestDeleteTask(task)}
                    />
                </>
            }
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
                                if (draggedId) reorder(draggedId, task.id);
                                return true;
                            }}
                        />
                    </>
                ) : undefined
            }
        />
    );
};
```

## Run it

```sh
npm run dev
```

Open All Tasks with the sort order on Manual, press on a row, and drag it upward. A translucent copy of the row follows your pointer, held at the point where you grabbed it. Release it over another row: the dragged row lands at that row's position and the rest shift down. Quit the app, start it again, and the list comes back in the order you left it.

Now the negative check. Open Preferences with <kbd>Ctrl</kbd><kbd>,</kbd>, set the sort order to Title, and close the dialog. The list reorders alphabetically, and pressing and dragging a row now does nothing at all: no ghost, no highlight, no movement. Switch back to Manual and the drag works again. Press <kbd>Ctrl</kbd><kbd>F</kbd> and type into the search box for the same result, because a partial list is not something you can meaningfully arrange.

## Summary

- Manual order is stored as a dense `position` per task, and `reorder` rewrites every position from the array index after splicing.
- Input in GTK4 lives in event controllers attached to a widget, mounted through the `controllers` slot.
- `GtkDragSource` supplies a payload from `onPrepare` as a `Gdk.ContentProvider`, and can set the dragged row itself as the drag icon.
- `GtkDropTarget` declares the types it accepts and returns `true` from `onDrop` to report the drop as handled.
- A slot gated with `undefined` mounts nothing, so a list that cannot be reordered carries no drag machinery.

## Next

[Reminders That Reach the Desktop](/tutorial/reminders)
