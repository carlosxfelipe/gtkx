---
description: "Give every row a checkbox, a star, and a delete button wired straight to store actions."
---

# Completing, Starring, and Deleting

In [Adding Tasks with a Store](/tutorial/the-task-store) you moved the task array into a zustand store and made the list writable, so typing a title into the top row appends a task. The rows themselves are still inert: nothing in them responds to a click.

In this chapter each row gains a checkbox that completes the task, a star that marks it important, and a button that deletes it. Along the way the row becomes its own component, and that component gets everything it needs from the store rather than from props.

## More actions on the store

A checkbox needs an action to call. Right now the store has one, `addTask`, and it can only append. Ticking a box changes the `done` field of a task that already exists, so the store needs actions that patch a task in place.

Every one of them does the same thing: find the task by id, and replace it with a copy carrying different fields. Write that once as a helper, then the actions stay one line each.

In `src/store/index.ts`, add the helper and the actions:

```ts
// ...

export type Store = {
    tasks: Task[];
    addTask: (listId: string, title: string) => string | null;
    setDone: (id: string, done: boolean) => void;
    setImportant: (id: string, important: boolean) => void;
    moveToTrash: (id: string) => void;
};

const patch = (tasks: Task[], id: string, fields: Partial<Task>): Task[] =>
    tasks.map((task) => (task.id === id ? { ...task, ...fields } : task));

export const useStore = create<Store>()((set) => ({
    // ...
    setDone: (id, done) =>
        set((state) => ({
            tasks: patch(state.tasks, id, { done, completedAt: done ? new Date().toISOString() : null }),
        })),
    setImportant: (id, important) => set((state) => ({ tasks: patch(state.tasks, id, { important }) })),
    moveToTrash: (id) => set((state) => ({ tasks: patch(state.tasks, id, { deleted: true }) })),
}));
```

`patch` maps over the array and rebuilds only the matching task, so the tasks you did not touch keep their identity. That matters for rendering: a row whose task object is unchanged has nothing to re-render.

`setDone` stamps `completedAt` at the same time it flips `done`, because the moment a task was finished is only knowable when it is finished. Clearing the box clears the timestamp.

`moveToTrash` sets a flag instead of removing the task from the array. A deleted task is still there, marked. That choice pays off twice later: [Smart Views, Filters, and Search](/tutorial/smart-views-and-search) surfaces those tasks as a Trash view, and [Deleting Without Fear](/tutorial/trash-and-toasts) turns the delete into something you can undo. You do not need either mechanism yet. What you do need is for the list to stop showing what you deleted.

In `src/components/task-list.tsx`, filter the deleted tasks out before rendering:

```diff
-                            {tasks.map((task) => (
+                            {tasks.filter((task) => !task.deleted).map((task) => (
```

## A component per row

The row is about to hold a checkbox, a toggle, a button, and a title that changes shape when the task is done. That is too much to keep inline inside the list, so give it a file.

Create `src/components/task-row.tsx`:

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { AdwActionRow } from "@gtkx/jsx/adw";
import { GtkButton, GtkCheckButton, GtkToggleButton } from "@gtkx/jsx/gtk";
import { escapeMarkup } from "../format.js";
import { useStore } from "../store/index.js";
import type { Task } from "../types.js";

export const TaskRow = ({ task }: { task: Task }) => {
    const setDone = useStore((state) => state.setDone);
    const setImportant = useStore((state) => state.setImportant);
    const moveToTrash = useStore((state) => state.moveToTrash);
    const title = task.done ? `<s>${escapeMarkup(task.title)}</s>` : escapeMarkup(task.title);

    return (
        <AdwActionRow
            title={title}
            useMarkup
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
                        onClicked={() => moveToTrash(task.id)}
                    />
                </>
            }
        />
    );
};
```

Then use it from the list. In `src/components/task-list.tsx`:

```tsx
// ...
import { TaskRow } from "./task-row.js";

export const TaskList = () => {
    // ...
    return (
        // ...
        {tasks.filter((task) => !task.deleted).map((task) => (
            <TaskRow key={task.id} task={task} />
        ))}
        // ...
    );
};
```

Read the props on `TaskRow` again: there is one, and it is data. No `onToggle`, no `onDelete`, no handler bundle. The row reaches the store itself, so adding a control to a row is a change to one file. The list never learns that the row grew a star, and neither does the window above it. That is the whole reason the store exists, and this is the first place it shows.

Three separate `useStore` calls rather than one that returns an object: each selects a single field, so each comparison is a plain `Object.is` against the previous value. Selecting the actions this way is free, because an action's identity never changes for the life of the store, so those subscriptions can never fire a re-render.

## The checkbox

`AdwActionRow` puts its title and subtitle in the middle and takes widgets on either side through `prefix` and `suffix`. Those are container slots: props that take JSX and attach it somewhere other than the child list, backed here by Adwaita's `add_prefix` and `add_suffix`. A slot is how you reach a widget's named attachment points from JSX, and you will meet more of them in later chapters.

The checkbox itself:

```tsx
prefix={
    <GtkCheckButton
        valign={Gtk.Align.CENTER}
        active={task.done}
        accessibleLabel="Mark complete"
        onToggled={(self) => setDone(task.id, self.active)}
    />
}
```

`active` comes from the task. `onToggled` reads the widget's own state back off the emitter and writes it to the store, which produces a new task, which flows back into `active`. That pairing, a value prop plus the signal that reports the widget's own change, is what makes a widget controlled in GTKX. It is the same shape as a controlled input on the web, and it is the shape every editable widget in this app uses.

`valign` centers the box against a row that is taller than it is; without it the checkbox stretches to the full row height and its hit area swallows the row.

## Striking through a completed title

A completed task should look completed. `AdwActionRow` renders its title as [Pango markup](https://docs.gtk.org/Pango/pango_markup.html) when you set `useMarkup`, so wrapping the title in `<s>` gives you a strikethrough with no CSS at all:

```tsx
const title = task.done ? `<s>${escapeMarkup(task.title)}</s>` : escapeMarkup(task.title);
```

The moment you turn markup on, the title is a small language rather than a string, and the reader types that string. A task called `Buy milk & eggs` is invalid markup, and a task called `<b>` is worse. So escape it. Text a user typed is never markup: escape it before wrapping it in tags you control.

Create `src/format.ts`:

```ts
export const escapeMarkup = (value: string): string =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
```

::: warning Title shows literal `<s>` tags, or the row title goes blank after an ampersand?
The literal tags mean `useMarkup` is missing from the `AdwActionRow`. A title that stops at an `&` or vanishes entirely means unescaped user text reached Pango and the parse failed. Both are fixed in the same expression: set `useMarkup`, and run every interpolated value through `escapeMarkup`.
:::

## The star and the trash button

The `suffix` slot takes a fragment, so both trailing controls live there. The star is a `GtkToggleButton`, since being important is a state the button displays rather than a one-shot command, and it swaps its icon on that state. Deleting is a command, so it is a plain `GtkButton`.

```tsx
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
            onClicked={() => moveToTrash(task.id)}
        />
    </>
}
```

The `flat` style class drops the button frame, which is what keeps a row from looking like a toolbar.

Both buttons show an icon and no text, which leaves them with no accessible name. Give an icon-only control an `accessibleLabel`. It is what a screen reader announces, and it is also the name the tests in [Appendix A](/tutorial/testing) query rows by, so a button without one is a button no test can click.

::: warning Star flickers, or snaps back to its old icon?
A `GtkToggleButton` will happily flip itself when clicked. If `active` is left unset, the widget keeps private state that the store knows nothing about, and the next render either fights it or reverts it. Drive `active` from `task.important` and let `onToggled` be the only thing that writes.
:::

::: details Why does the store hold `important` rather than the button?
The button is one of several things that will care. The star in the row, the Important smart view, and the task editor all read the same field, and the button can be unmounted (scrolled away, or filtered out) without the task ceasing to be important. State that outlives the widget belongs outside the widget.
:::

## Run it

```sh
npm run dev
```

Tick the checkbox on **Welcome to Tasks**. Its title gets a strikethrough immediately, and the box stays ticked.

Click the star on any row. The outline icon fills in and stays filled. Click it again and it empties.

Click the trash button on a row. The row leaves the list. The task is not gone from the store, only flagged, and the list is filtering it out.

Now quit and start the app again. The strikethrough is gone, the star is empty, and the deleted row is back. Nothing you did survived the process, because the store still lives only in memory. That is the next chapter.

## Checkpoint

The full file, `src/components/task-row.tsx`:

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { AdwActionRow } from "@gtkx/jsx/adw";
import { GtkButton, GtkCheckButton, GtkToggleButton } from "@gtkx/jsx/gtk";
import { escapeMarkup } from "../format.js";
import { useStore } from "../store/index.js";
import type { Task } from "../types.js";

export const TaskRow = ({ task }: { task: Task }) => {
    const setDone = useStore((state) => state.setDone);
    const setImportant = useStore((state) => state.setImportant);
    const moveToTrash = useStore((state) => state.moveToTrash);
    const title = task.done ? `<s>${escapeMarkup(task.title)}</s>` : escapeMarkup(task.title);

    return (
        <AdwActionRow
            title={title}
            useMarkup
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
                        onClicked={() => moveToTrash(task.id)}
                    />
                </>
            }
        />
    );
};
```

## Summary

- **Actions that change an existing task patch the array**, mapping over it and rebuilding only the task whose id matches, so untouched tasks keep their identity.
- **Deleting sets a flag**, and the list filters flagged tasks out, which leaves the data available for the Trash view and for undo later.
- **A row component takes data and no callbacks**, because it reads its actions from the store, so a new control in a row changes one file.
- **`prefix` and `suffix` are container slots**, props that take JSX and attach it to a named point on the widget instead of the child list.
- **A value prop paired with its change signal makes a widget controlled**, and leaving the value prop off lets the widget keep state your store cannot see.
- **User text is never markup**, so escape it before wrapping it in tags of your own.
- **An icon-only control needs an `accessibleLabel`**, which is both its announced name and the name tests find it by.

## Next

[Saving Tasks Between Runs](/tutorial/saving-to-disk) puts the store on disk, so everything you ticked, starred, and typed is still there the next time you launch.
