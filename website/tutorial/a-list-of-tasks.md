---
description: "Model a task and render a hardcoded array as an Adwaita boxed list."
---

# Showing a List of Tasks

In [Your First Window](/tutorial/your-first-window) you put an Adwaita window with a header bar on screen, and its body is still a status page saying there are no tasks yet. Now you make that a lie: real rows, from real data, before any state management exists.

## The data model, first

Every component you add from here reads this shape, so write it down before you draw anything.

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

`title` is the one line you see in the list, `notes` the longer body you see when you open it, and `position` is where the task sits in manual order.

The dates are ISO strings, not `Date` objects. In [Saving Tasks Between Runs](/tutorial/saving-to-disk) this object goes straight through `JSON.stringify` into a file on disk, and a `Date` would come back out as a string anyway. Build a `Date` from one at the point where you compare or format it.

## A hardcoded array

Skip the store for one chapter. An array is enough to prove the widgets work.

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

The component stops reading this array in [Adding Tasks with a Store](/tutorial/the-task-store), but the data survives: it moves into a seed module and becomes what a fresh install starts with.

## The list frame

A list of tasks grows past the height of a window, so the outermost widget is `GtkScrolledWindow`. `vexpand` makes it claim all the vertical space the toolbar view will give it, which is what makes it the thing that scrolls rather than the thing that gets squashed.

One-line rows stretched across a wide monitor are unreadable, so `AdwClamp` caps the content width at `maximumSize` pixels and centers anything narrower than the window. The margins keep the card off the window edges.

Rows go in a `GtkListBox`. Add the `boxed-list` style class and Adwaita draws it as a rounded card with separators between rows, the standard GNOME look for a settings-style list.

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

Style classes are plain strings, the same names in the Adwaita style class documentation, and `cssClasses` takes an array because a widget can carry several at once. Nothing about them is GTKX-specific, so anything Adwaita ships (`flat`, `pill`, `destructive-action`, `dim-label`) is available by typing its name. Your own stylesheets work the same way, covered in [CSS](/guide/css).

`selectionMode={Gtk.SelectionMode.NONE}` turns off the list box's own selection highlight. A task row carries its own controls, so clicking a row means "open this task" rather than "select this row". Enumerations like `Gtk.SelectionMode` come from `@gtkx/gi/gtk`, the generated binding for the GTK4 namespace, while the components come from `@gtkx/jsx/gtk`.

::: warning The card lost its rounded frame?
`cssClasses` replaces the widget's whole class list on every render, it does not append. Passing `cssClasses={["my-class"]}` to this `GtkListBox` drops `boxed-list` along with it, and the card flattens into plain stacked rows with no border. List every class the widget should carry in the one array: `cssClasses={["boxed-list", "my-class"]}`.
:::

## One row per task

`AdwActionRow` is the standard row: a title, an optional subtitle under it, and slots on either side for controls.

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

Every list in this app relies on `key`. The reconciler compares the elements you returned this render against the ones you returned last render, and without a key it matches them by position: inserting a task at the top makes every row below it look changed, and each one gets its properties rewritten. With a stable key, the reconciler recognizes the same task in a new place and moves the existing `AdwActionRow` instead of rebuilding it. That is what makes dragging a row in [Dragging Tasks Into Order](/tutorial/drag-to-reorder) cost a reparent rather than a rebuild of the whole card.

Use the task's `id`, never the array index. An index key claims that the row in slot zero is still the row in slot zero, which is exactly what is false when the order changes.

::: tip Terminal says `Each child in a list should have a unique "key" prop`
The key belongs on the outermost element the callback returns, which here is `AdwActionRow`. If you later wrap the row in anything, move `key` out to the wrapper, because that is the element the reconciler matches against last render.
:::

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

Save, and watch the window you already have open. The status page is gone: the body is a rounded card holding the task titles, centered under the header bar with a margin. "Welcome to Tasks" has its notes text as a second line under the title; the others show a title alone, because their notes are empty.

Drag the window wider: past a certain width the card stops growing and stays centered, which is the clamp. Drag it short until the rows do not fit, and the list scrolls instead of clipping.

Then add another entry to `TASKS`, copying an existing one and changing its `id` and `title`. Saving is the whole step: the new row appears in the card between one keystroke and the next.

## Next

A list you cannot add to is a demo. [Adding Tasks with a Store](/tutorial/the-task-store) moves the tasks into a store and lets you type a new one.
