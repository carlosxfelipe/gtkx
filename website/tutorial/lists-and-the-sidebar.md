---
description: "Add task lists, split the store into slices, and navigate between lists from a sidebar."
---

# Lists and a Sidebar

Your tasks now survive a restart, saved as JSON under the XDG data directory by the [`persist` middleware](/tutorial/saving-to-disk). Everything is still one flat list.

One flat list stops working somewhere past a few dozen tasks. This chapter gives the app a second kind of thing, a **list** with a name and a color, puts a sidebar of those lists down the left edge of the window, and makes the content pane follow whichever one you click.

That is a lot of new state, so the store gets reorganized first.

## A second type

A list is an id, a name, and a color. A task belongs to exactly one list, so `Task` gains a `listId`. And the interface needs to remember which list you are looking at, which is what `Selection` is for.

In `src/types.ts`:

```ts
export type TaskList = { // [!code ++]
    id: string; // [!code ++]
    name: string; // [!code ++]
    color: string; // [!code ++]
}; // [!code ++]
 // [!code ++]
export type Task = {
    id: string;
    listId: string; // [!code ++]
    title: string;
    // ...
};

export type Selection = { kind: "list"; listId: string }; // [!code ++]
```

`Selection` is a single-member union today, which looks like a wrapper around a string. It is written this way because the sidebar is about to hold entries that are not lists at all: All Tasks, Today, Important, and Trash. Those arrive in [Smart Views, Filters, and Search](/tutorial/smart-views-and-search) as a second variant, and the `kind` tag is what will let the code tell them apart. You do not need to think about that variant yet.

Now give the app some lists to start with. Your seed tasks already carry a `listId`, so they land in the right place as soon as the lists exist, and the two you add here give the third list something to show. In `src/store/seed.ts`:

```ts
import type { Task, TaskList } from "../types.js"; // [!code ++]

// ...

export const seedLists: TaskList[] = [ // [!code ++]
    { id: "personal", name: "Personal", color: "#3584e4" }, // [!code ++]
    { id: "work", name: "Work", color: "#2ec27e" }, // [!code ++]
    { id: "shopping", name: "Shopping", color: "#e66100" }, // [!code ++]
]; // [!code ++]

export const seedTasks: Task[] = [
    // ...
    task({ id: "t3", listId: "work", title: "Prepare the weekly report", position: 2, due: isoInDays(1) }),
    task({ id: "t4", listId: "work", title: "Review pull requests", position: 3 }), // [!code ++]
    task({ id: "t5", listId: "shopping", title: "Buy oat milk", position: 4 }), // [!code ++]
    task({ // [!code ++]
        id: "t6", // [!code ++]
        listId: "shopping", // [!code ++]
        title: "Order birthday gift", // [!code ++]
        position: 5, // [!code ++]
        due: isoInDays(3), // [!code ++]
        important: true, // [!code ++]
    }), // [!code ++]
];
```

The colors are the Adwaita palette's blue 3, green 4, and orange 3. Any hex string works.

## Splitting the store

`src/store/index.ts` currently holds the state, every action, and the `persist` configuration in one file, and this chapter is about to add lists and a selection to it. Split it now, while it is still small enough to move in one sitting.

Zustand calls the pieces **slices**. A slice is a function that returns part of the state, and the store is the slices spread into one object. Start with the tasks.

`src/store/tasks.ts`:

```ts
import type { StateCreator } from "zustand";
import type { Task } from "../types.js";
import type { Mutators, Store } from "./index.js";
import { seedTasks } from "./seed.js";

export type TasksSlice = {
    tasks: Task[];
    addTask: (listId: string, title: string) => string | null;
    setDone: (id: string, done: boolean) => void;
    setImportant: (id: string, important: boolean) => void;
    moveToTrash: (id: string) => void;
};

const patch = (tasks: Task[], id: string, fields: Partial<Task>): Task[] =>
    tasks.map((task) => (task.id === id ? { ...task, ...fields } : task));

export const createTasksSlice: StateCreator<Store, Mutators, [], TasksSlice> = (set) => ({
    tasks: seedTasks,
    addTask: (listId, title) => {
        const trimmed = title.trim();
        if (trimmed === "") return null;
        const id = crypto.randomUUID();
        set((state) => ({
            tasks: [
                ...state.tasks,
                {
                    id,
                    listId,
                    title: trimmed,
                    notes: "",
                    done: false,
                    important: false,
                    deleted: false,
                    due: null,
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                },
            ],
        }));
        return id;
    },
    setDone: (id, done) =>
        set((state) => ({
            tasks: patch(state.tasks, id, { done, completedAt: done ? new Date().toISOString() : null }),
        })),
    setImportant: (id, important) => set((state) => ({ tasks: patch(state.tasks, id, { important }) })),
    moveToTrash: (id) => set((state) => ({ tasks: patch(state.tasks, id, { deleted: true }) })),
});
```

The state and the actions are the ones you already wrote. What is new is the signature on top, and it is worth reading slowly, because every slice in the app carries it:

```ts
StateCreator<Store, Mutators, [], TasksSlice>
```

- The first parameter is the type of the **whole** store, not this slice. That is what lets a slice read another slice's state inside `set((state) => ...)`, and it is why every slice imports `Store` from `index.ts`.
- The second is the middleware wrapping the store. `Mutators` is `[["zustand/persist", unknown]]`, a one-entry tuple recording that `persist` is in play. Zustand needs this so `set` has the right type inside the slice: a store that is persisted has a slightly richer setter than a bare one.
- The third is the middleware this slice applies on its own, which is none, so it is an empty tuple.
- The fourth is what this slice contributes to the store.

::: warning Type errors like `Argument of type '(set) => {...}' is not assignable`?
The mutator tuple has to match the middleware actually wrapping the composed store. If you write `StateCreator<Store, [], [], TasksSlice>` while `index.ts` wraps everything in `persist`, the `set` types disagree and every slice fails to compose. Keep `Mutators` in one place and import it.
:::

That points at the rule this chapter fixes in place: **middleware is applied once, to the combined store, and never inside a slice.** A slice describes state and behavior. Persistence is a property of the store as a whole.

Lists are much smaller. `src/store/lists.ts`:

```ts
import type { StateCreator } from "zustand";
import type { TaskList } from "../types.js";
import type { Mutators, Store } from "./index.js";
import { seedLists } from "./seed.js";

export type ListsSlice = {
    lists: TaskList[];
    addList: (name: string, color: string) => void;
};

export const createListsSlice: StateCreator<Store, Mutators, [], ListsSlice> = (set) => ({
    lists: seedLists,
    addList: (name, color) => {
        const trimmed = name.trim();
        if (trimmed === "") return;
        set((state) => ({ lists: [...state.lists, { id: crypto.randomUUID(), name: trimmed, color }] }));
    },
});
```

Nothing calls `addList` yet. The dialog that does arrives in [Deleting Without Fear](/tutorial/trash-and-toasts); the action is here now because it belongs with the state it changes.

## Where new state goes

The selection is different in kind from tasks and lists. It is not something you typed, it is what the interface is currently doing. Reopen the app tomorrow and it should not matter which list happened to be highlighted when you quit.

So it goes in a third slice that `partialize` never writes to disk.

`src/store/ui.ts`:

```ts
import type { StateCreator } from "zustand";
import type { Selection } from "../types.js";
import type { Mutators, Store } from "./index.js";

export type UiSlice = {
    selection: Selection;
    select: (selection: Selection) => void;
};

export const createUiSlice: StateCreator<Store, Mutators, [], UiSlice> = (set) => ({
    selection: { kind: "list", listId: "personal" },
    select: (selection) => set({ selection }),
});
```

Here is the rule to reuse for the rest of the tutorial, and it decides where every new field lands:

- Data the user typed goes in a persisted slice: `tasks`, `lists`.
- What the interface is currently doing goes in the UI slice: the selection now, and later the filter, the search query, and which dialog is open.
- Settings the user chose on purpose go in GSettings, which arrives in [Preferences and the System Theme](/tutorial/preferences-and-theming).

## Composing them

`src/store/index.ts` now does one job: put the slices together and configure `persist`.

`src/store/index.ts`:

```ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Task, TaskList } from "../types.js";
import { createListsSlice, type ListsSlice } from "./lists.js";
import { seedLists, seedTasks } from "./seed.js";
import { fileStorage } from "./storage.js";
import { createTasksSlice, type TasksSlice } from "./tasks.js";
import { createUiSlice, type UiSlice } from "./ui.js";

export type Store = TasksSlice & ListsSlice & UiSlice;

export type PersistedState = { lists: TaskList[]; tasks: Task[] };

export type Mutators = [["zustand/persist", unknown]];

const isPersistedState = (value: unknown): value is PersistedState =>
    typeof value === "object" &&
    value !== null &&
    Array.isArray(Reflect.get(value, "lists")) &&
    Array.isArray(Reflect.get(value, "tasks"));

export const useStore = create<Store>()(
    persist(
        (...a) => ({
            ...createTasksSlice(...a),
            ...createListsSlice(...a),
            ...createUiSlice(...a),
        }),
        {
            name: "tasks",
            version: 1,
            storage: createJSONStorage(() => fileStorage),
            partialize: (state): PersistedState => ({ lists: state.lists, tasks: state.tasks }),
            migrate: (persisted) => (isPersistedState(persisted) ? persisted : { lists: seedLists, tasks: seedTasks }),
        },
    ),
);
```

`Store` is the intersection of the slice types, so `useStore((state) => state.tasks)` and `useStore((state) => state.select)` both typecheck against the same object. Nothing at the call sites changes: components still read one bound store and never know a slice exists.

The `(...a)` spread is the one piece of syntax worth naming. Zustand hands a state creator three arguments (`set`, `get`, and the store api). Collecting them into `a` and forwarding the whole thing to each slice means each slice receives the identical trio, so they all write into one shared state object rather than three.

`PersistedState` and `partialize` both gain `lists` here, which is what puts your lists in the JSON file alongside your tasks. `selection` is absent from both, so it starts at Personal on every launch, exactly as intended.

::: details Why does `Mutators` say `unknown` rather than `PersistedState`?
The second slot of the tuple means different things on the two sides of the middleware. Zustand types `persist` so that the mutator entry on the *initializer* it receives is literally `unknown`; the partialized type appears on the mutator `persist` writes, not on the one your slices declare. Substituting `PersistedState` there produces `TS2345` on every slice.

`PersistedState` is still doing real work: it annotates the return of `partialize` and it is what `isPersistedState` narrows to, which is how `migrate` returns a well-typed value without a cast.
:::

## The two panes

Adwaita has a widget for exactly this layout. `AdwNavigationSplitView` shows a sidebar and a content area side by side, and it knows how to fold into a single pane on a narrow window, which the next chapter turns on.

Its `sidebar` and `content` are container slots, the same idea as `topBar` on `AdwToolbarView`. Each takes an `AdwNavigationPage`, the unit Adwaita treats as one pane: a page has a title, and it is what the navigation gets to move between.

A page carries no header bar of its own, so each one supplies its own `AdwToolbarView` with its own `AdwHeaderBar`. That is deliberate rather than redundant: the sidebar's header and the content's header hold different controls and, once collapsed, only one of them is on screen at a time.

This has outgrown `app.tsx`, so the window moves into its own file.

`src/components/window.tsx`:

```tsx
import {
    AdwApplicationWindow,
    AdwHeaderBar,
    AdwNavigationPage,
    AdwNavigationSplitView,
    AdwToolbarView,
} from "@gtkx/jsx/adw";
import { useStore } from "../store/index.js";
import { ContentPane } from "./content-pane.js";
import { Sidebar } from "./sidebar.js";

export const Window = () => {
    const lists = useStore((state) => state.lists);
    const selection = useStore((state) => state.selection);
    const title = lists.find((list) => list.id === selection.listId)?.name ?? "Tasks";

    return (
        <AdwApplicationWindow title="Tasks" widthRequest={360} heightRequest={294}>
            <AdwNavigationSplitView
                sidebarWidthFraction={0.25}
                minSidebarWidth={220}
                maxSidebarWidth={300}
                sidebar={
                    <AdwNavigationPage title="Tasks">
                        <AdwToolbarView topBar={<AdwHeaderBar />}>
                            <Sidebar />
                        </AdwToolbarView>
                    </AdwNavigationPage>
                }
                content={
                    <AdwNavigationPage title={title}>
                        <ContentPane />
                    </AdwNavigationPage>
                }
            />
        </AdwApplicationWindow>
    );
};
```

The width props keep the sidebar at a quarter of the window, never narrower than 220 points and never wider than 300, so it stays legible without eating the task list on a wide monitor.

The content pane is a thin component whose job is to pair a header bar with what goes under it. It stays thin only for now: [Opening a Task](/tutorial/the-task-editor) makes it choose between the list and an editor, and this is the seam that choice happens on.

`src/components/content-pane.tsx`:

```tsx
import { AdwHeaderBar, AdwToolbarView } from "@gtkx/jsx/adw";
import { TaskList } from "./task-list.js";

export const ContentPane = () => (
    <AdwToolbarView topBar={<AdwHeaderBar />}>
        <TaskList />
    </AdwToolbarView>
);
```

`app.tsx` is left holding the application root, which is all it should ever have held.

`src/app.tsx`:

```tsx
import { AdwApplication } from "@gtkx/jsx/adw";
import { Window } from "./components/window.js";

export function App() {
    return (
        <AdwApplication>
            <Window />
        </AdwApplication>
    );
}
```

## A dot for each list

Each sidebar row shows its list's color as a small filled circle. GTK4 styles widgets with CSS, and `@gtkx/css` gives you a `css` tagged template that takes a rule body, registers it with the style manager, and returns a generated class name you can hand to `cssClasses`.

Because the color is interpolated, `listDot` is a function: call it with a hex string and get back a class name for a dot of that color.

`src/styles.ts`:

```ts
import { css } from "@gtkx/css";

export const listDot = (color: string): string => css`
    min-width: 12px;
    min-height: 12px;
    border-radius: 9999px;
    background: ${color};
`;
```

Reach for this sparingly. Adwaita's own style classes, the `boxed-list` and `flat` you have already used, cover almost everything and follow the user's theme for free. Writing CSS is for the cases the platform has no class for, and a colored dot is one of them. For more, see [Styling with CSS](/guide/css).

## The sidebar

`src/components/sidebar.tsx`:

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { AdwActionRow } from "@gtkx/jsx/adw";
import { GtkBox, GtkListBox, GtkScrolledWindow } from "@gtkx/jsx/gtk";
import { useEffect, useRef } from "react";
import { useStore } from "../store/index.js";
import { listDot } from "../styles.js";

export const Sidebar = () => {
    const lists = useStore((state) => state.lists);
    const selection = useStore((state) => state.selection);
    const select = useStore((state) => state.select);

    const activeIndex = lists.findIndex((list) => list.id === selection.listId);
    const listRef = useRef<Gtk.ListBox | null>(null);

    useEffect(() => {
        const box = listRef.current;
        if (!box || activeIndex < 0) return;
        const row = box.getRowAtIndex(activeIndex);
        if (row) box.selectRow(row);
    }, [activeIndex]);

    return (
        <GtkScrolledWindow vexpand>
            <GtkListBox
                ref={listRef}
                cssClasses={["navigation-sidebar"]}
                onRowSelected={(row) => {
                    if (!row) return;
                    const list = lists[row.getIndex()];
                    if (list && list.id !== selection.listId) select({ kind: "list", listId: list.id });
                }}
            >
                {lists.map((list) => (
                    <AdwActionRow
                        key={list.id}
                        title={list.name}
                        prefix={
                            <GtkBox
                                valign={Gtk.Align.CENTER}
                                cssClasses={[listDot(list.color)]}
                                accessibleRole={Gtk.AccessibleRole.PRESENTATION}
                            />
                        }
                    />
                ))}
            </GtkListBox>
        </GtkScrolledWindow>
    );
};
```

Three things to notice before the hard part.

The `navigation-sidebar` style class is what makes this look like a GNOME sidebar rather than a plain list: flat rows, no card, the selected row highlighted the way the platform highlights it. It is a plain string, like `boxed-list` on the task list.

Unlike the task list, this list box keeps its default selection mode. Selecting a row here *is* the interaction, so the widget's own selection is meaningful and should be visible.

The dot gets `accessibleRole={Gtk.AccessibleRole.PRESENTATION}`. It carries no information a screen reader could use, and the row's title already says which list it is, so it is taken out of the accessibility tree instead of being announced as an anonymous box.

## Keeping GTK4 and the store in agreement

This is the awkward passage of the chapter, and it is awkward for a reason worth understanding, because it recurs with every widget that owns state you also keep.

A `GtkListBox` holds its own selection. React does not tell it which row is selected; it decides, and it reports. So there are two copies of the same fact, the widget's and the store's, and they have to be kept level from both directions:

- **Widget to store.** The user clicks a row, the box emits `row-selected`, and `onRowSelected` writes the new selection into the store.
- **Store to widget.** Something other than a click changes the selection, so the effect calls `selectRow` to move the widget's highlight to match.

Run those two naively and they feed each other. The effect calls `selectRow`, the box emits `row-selected` because its selection genuinely did change, and the handler writes the value back into the store. The value is identical, so nothing visibly breaks, but every programmatic selection now costs a redundant store write, and the moment `select` does more than set one field (it starts doing exactly that in the [next chapter](/tutorial/an-adaptive-layout)) that echo becomes a real bug.

The fix is the comparison already in the handler:

```tsx
if (list && list.id !== selection.listId) select({ kind: "list", listId: list.id });
```

The handler asks whether anything actually differs and returns early when it does not, so the echo stops at the first bounce. State the rule generally, because it applies to every widget in the rest of this tutorial that holds state React also holds: **when you push state into a widget that reports its own changes, the report handler compares before it writes.**

::: warning Sidebar flickers, or clicking a row selects a different one?
That is the loop above running unchecked. Make sure the equality check is in `onRowSelected`, and that the effect depends on `activeIndex` rather than on `selection`, so it does not re-run on every unrelated store change.
:::

## Filtering by list

The task list still shows everything. Point it at the selection.

In `src/components/task-list.tsx`:

```tsx
export const TaskList = () => {
    const tasks = useStore((state) => state.tasks);
    const selection = useStore((state) => state.selection); // [!code ++]
    const addTask = useStore((state) => state.addTask);

    const visible = tasks.filter((task) => !task.deleted); // [!code --]
    const visible = tasks.filter((task) => !task.deleted && task.listId === selection.listId); // [!code ++]

    // ...
```

And the add row creates the new task in the list you are looking at:

```tsx
<AdwEntryRow
    title="Add a task…"
    onEntryActivated={(self) => {
        addTask(selection.listId, self.text); // [!code ++]
        self.text = "";
    }}
/>
```

Both of these follow the reading rule from [Adding Tasks with a Store](/tutorial/the-task-store): select the smallest stable thing, `tasks` and `selection`, and derive the rest during render. The filtering happens in the component body, not inside the selector, which matters more than it looks like it does. [Smart Views, Filters, and Search](/tutorial/smart-views-and-search) explains exactly why and moves this expression into a named function.

## Run it

```bash
npm run dev
```

The window is now two panes. On the left, a sidebar with Personal, Work, and Shopping, each with a colored dot, Personal highlighted. On the right, the tasks in Personal and nothing else.

Click **Work**. The content pane switches to the two work tasks and the window title changes to Work. Click **Shopping** and it follows again.

Type a task into the add row while Shopping is selected, press Enter, then click Personal and back to Shopping. The new task is in Shopping and only in Shopping.

Quit and start again. Your lists and tasks are still there, and the selection is back on Personal, because the UI slice is not persisted.

## Summary

- **A slice is a state creator typed with `StateCreator<Store, Mutators, [], ThisSlice>`.** Its first parameter is the whole store, so slices can read each other; its last is what it contributes.
- **Middleware wraps the composed store, once.** `persist` lives in `index.ts` and slices only declare that it is there, through `Mutators`.
- **The UI slice holds what the interface is doing, and `partialize` leaves it out**, so it starts fresh on every launch.
- **`AdwNavigationSplitView` takes two `AdwNavigationPage` slots**, each supplying its own header bar through an `AdwToolbarView`.
- **A widget that owns its own state needs both directions wired, and the report handler compares before writing**, or the two copies echo each other.
- **`css` returns a generated class name**, for the cases Adwaita's own style classes do not cover.

## Next

Continue to [A Layout That Collapses](/tutorial/an-adaptive-layout).
