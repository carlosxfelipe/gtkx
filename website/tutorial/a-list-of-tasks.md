---
description: "Model a task and render a hardcoded array as an Adwaita boxed list."
---

# Showing a List of Tasks

In [Your First Window](/tutorial/your-first-window) you put an Adwaita window with a header bar on screen, and its body is still a status page saying there are no tasks yet. Now you make that a lie: real rows, from real data, before any state management exists.

## The data model, first

A task app needs to agree with itself about what a task is. Write that down before you draw anything, because every component you add from here reads this shape.

Create `src/types.ts`:

```ts
export type Task = {
    id: string;
    listId: string;
    title: string;
    notes: string;
    done: boolean;
    important: boolean;
    deleted: boolean;
    due: string | null;
    position: number;
    createdAt: string;
    completedAt: string | null;
};
```

`id` identifies the task for the rest of its life. `listId` says which list it belongs to. `title` is the one line you see in the list, `notes` the longer body you see when you open it. `done`, `important`, and `deleted` are the states a row can toggle. `due` is when it is due, or `null` if it is not. `position` is where it sits in manual order. `createdAt` and `completedAt` record when it appeared and when it was ticked off.

The dates are ISO strings, not `Date` objects, and that is a deliberate choice you make now to avoid a conversion later: in [Saving Tasks Between Runs](/tutorial/saving-to-disk) this object goes straight through `JSON.stringify` into a file on disk. A `Date` would come back out as a string anyway, so it is a string from the start. When you need to compare or format one, you build a `Date` from it at the point of use.

## A hardcoded array

Skip the store for one chapter. An array is enough to prove the widgets work, and it makes the next chapter's change small and obvious.

Create `src/components/task-list.tsx`:

```tsx
import type { Task } from "../types.js";

const createdAt = new Date().toISOString();

const TASKS: Task[] = [
    {
        id: "t1",
        listId: "personal",
        title: "Welcome to Tasks",
        notes: "This is your first task. Tick the checkbox to complete it, or open it to add notes and a due date.",
        done: false,
        important: false,
        deleted: false,
        due: null,
        position: 0,
        createdAt,
        completedAt: null,
    },
    {
        id: "t2",
        listId: "personal",
        title: "Water the plants",
        notes: "",
        done: false,
        important: true,
        deleted: false,
        due: null,
        position: 1,
        createdAt,
        completedAt: null,
    },
    {
        id: "t3",
        listId: "work",
        title: "Prepare the weekly report",
        notes: "",
        done: false,
        important: false,
        deleted: false,
        due: null,
        position: 2,
        createdAt,
        completedAt: null,
    },
];
```

This array is temporary in one sense and permanent in another. The component stops reading it in [Adding Tasks with a Store](/tutorial/the-task-store), but the data itself survives: it moves into a seed module and becomes what a fresh install starts with.

## The list frame

Three widgets sit between the window and the rows, and each one earns its place.

A list of tasks grows past the height of a window, so the outermost widget is `GtkScrolledWindow`. `vexpand` tells it to take all the vertical space the toolbar view will give it, which is what makes it the thing that scrolls rather than the thing that gets squashed.

A list of one-line rows stretched across a wide monitor is unreadable, so `AdwClamp` caps the content width. `maximumSize={640}` is the cap in pixels, and the clamp centers whatever is narrower than the window. The margins keep the card off the window edges.

Rows themselves go in a `GtkListBox`. Add the `boxed-list` style class and Adwaita draws it as a rounded card with separators between rows, which is the standard GNOME look for a settings-style list.

Add the frame to `src/components/task-list.tsx`:

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { AdwClamp } from "@gtkx/jsx/adw";
import { GtkListBox, GtkScrolledWindow } from "@gtkx/jsx/gtk";
import type { Task } from "../types.js";

// ...

export const TaskList = () => (
    <GtkScrolledWindow vexpand>
        <AdwClamp maximumSize={640} marginTop={12} marginBottom={12} marginStart={12} marginEnd={12}>
            <GtkListBox selectionMode={Gtk.SelectionMode.NONE} cssClasses={["boxed-list"]}>
                {/* ... */}
            </GtkListBox>
        </AdwClamp>
    </GtkScrolledWindow>
);
```

Style classes are how Adwaita styling works. They are plain strings, the same names you find in the Adwaita style class documentation, and `cssClasses` takes an array of them because a widget can carry several at once. Nothing about them is GTKX-specific, which means anything the Adwaita designers ship (`flat`, `pill`, `destructive-action`, `dim-label`) is available to you by typing its name. Your own stylesheets get the same treatment, covered in [CSS](/guide/css).

`selectionMode={Gtk.SelectionMode.NONE}` turns off the list box's own selection highlight. A task row carries its own controls, a checkbox and a star and a delete button, so clicking a row means "open this task" rather than "select this row". Enumerations like `Gtk.SelectionMode` come from `@gtkx/gi/gtk`, the generated binding for the GTK4 namespace, while the components come from `@gtkx/jsx/gtk`.

::: warning The card lost its rounded frame?
`cssClasses` sets the widget's entire class list rather than appending to it. If a row or list stops looking like Adwaita after you add a class of your own, check that you kept the existing ones in the array instead of replacing them.
:::

## One row per task

`AdwActionRow` is the standard row: a title, an optional subtitle under it, and slots on either side for controls. Map the array onto it.

Fill in the list box in `src/components/task-list.tsx`:

```tsx
<GtkListBox selectionMode={Gtk.SelectionMode.NONE} cssClasses={["boxed-list"]}>
    {TASKS.map((task) => (
        <AdwActionRow key={task.id} title={task.title} subtitle={task.notes} />
    ))}
</GtkListBox>
```

Update the import to bring in the row alongside the clamp:

```ts
import { AdwActionRow, AdwClamp } from "@gtkx/jsx/adw";
```

The `key` is doing real work here, and it is worth understanding once because every list in this app relies on it. The reconciler compares the elements you returned this render against the ones you returned last render. Without a key it matches them by position, so inserting a task at the top makes every row below it look like it changed, and each one gets its properties rewritten. With a stable key, the reconciler recognizes the same task in a new place and moves the existing `AdwActionRow` object instead of rebuilding it. That is what will make dragging a row to a new position in [Dragging Tasks Into Order](/tutorial/drag-to-reorder) cost a reparent rather than a rebuild of the whole card.

Use the task's `id`, never the array index. An index key tells the reconciler that the row in slot zero is still the row in slot zero, which is exactly the claim that is false when the order changes.

## Run it

Point the window body at the list. In `src/app.tsx`, swap the status page for the component:

```diff
-                    <AdwStatusPage title="No Tasks Yet" iconName="checkbox-checked-symbolic" />
+                    <TaskList />
```

and import it:

```diff
+import { TaskList } from "./components/task-list.js";
```

`AdwStatusPage` is no longer used in this file, so drop it from the `@gtkx/jsx/adw` import.

Start the app:

```sh
npm run dev
```

The window body is now a rounded card holding the task titles, centered under the header bar with a comfortable margin. "Welcome to Tasks" has its notes text as a second line under the title; the others show a title alone, because their notes are empty.

Two things to check. Drag the window narrower and wider: past a certain width the card stops growing and stays centered, which is the clamp. Now drag the window short until the rows do not fit, and the list scrolls instead of clipping.

Then add a fourth entry to `TASKS`, copying an existing one and changing its `id` and `title`, and save the file. The running window shows the new row without a restart.

## Checkpoint

The complete `src/components/task-list.tsx`:

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { AdwActionRow, AdwClamp } from "@gtkx/jsx/adw";
import { GtkListBox, GtkScrolledWindow } from "@gtkx/jsx/gtk";
import type { Task } from "../types.js";

const createdAt = new Date().toISOString();

const TASKS: Task[] = [
    {
        id: "t1",
        listId: "personal",
        title: "Welcome to Tasks",
        notes: "This is your first task. Tick the checkbox to complete it, or open it to add notes and a due date.",
        done: false,
        important: false,
        deleted: false,
        due: null,
        position: 0,
        createdAt,
        completedAt: null,
    },
    {
        id: "t2",
        listId: "personal",
        title: "Water the plants",
        notes: "",
        done: false,
        important: true,
        deleted: false,
        due: null,
        position: 1,
        createdAt,
        completedAt: null,
    },
    {
        id: "t3",
        listId: "work",
        title: "Prepare the weekly report",
        notes: "",
        done: false,
        important: false,
        deleted: false,
        due: null,
        position: 2,
        createdAt,
        completedAt: null,
    },
];

export const TaskList = () => (
    <GtkScrolledWindow vexpand>
        <AdwClamp maximumSize={640} marginTop={12} marginBottom={12} marginStart={12} marginEnd={12}>
            <GtkListBox selectionMode={Gtk.SelectionMode.NONE} cssClasses={["boxed-list"]}>
                {TASKS.map((task) => (
                    <AdwActionRow key={task.id} title={task.title} subtitle={task.notes} />
                ))}
            </GtkListBox>
        </AdwClamp>
    </GtkScrolledWindow>
);
```

## Summary

- **A task is a plain object**, and its dates are ISO strings so the whole record can be written to disk as JSON without a conversion step.
- **`GtkScrolledWindow` and `AdwClamp` are the frame**: one makes a long list scrollable, the other keeps it readable on a wide screen.
- **Adwaita styling is style classes**, plain strings passed as an array to `cssClasses`, and `boxed-list` on a `GtkListBox` is the rounded card.
- **`AdwActionRow` is the standard row**, and `SelectionMode.NONE` keeps the list from claiming clicks that belong to the row's own controls.
- **A key by `id` lets the reconciler move a widget** rather than rebuild it when the order changes.

## Next

The array is a constant, and a list you cannot add to is a demo. [Adding Tasks with a Store](/tutorial/the-task-store) moves the tasks into a store and lets you type a new one.
