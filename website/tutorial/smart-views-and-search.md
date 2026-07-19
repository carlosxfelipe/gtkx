---
description: "Derive All Tasks, Today, Important, and Trash, count them, and filter and search the list."
---

# Smart Views, Filters, and Search

Your window now collapses to a single pane on a narrow screen and reopens as two when there is room, which you built in [A Layout That Collapses](/tutorial/an-adaptive-layout).

The sidebar can reach a list. It cannot reach everything due today, everything you starred, or everything you deleted. None of that needs new state: a task already carries `due`, `important`, and `deleted`, and the answer is a filter over the array you have. This chapter is the one where the app starts to feel like it knows things, and it stores nothing to do it.

## A selection that is not always a list

Up to now `Selection` had one shape, so the sidebar could compare `selection.listId` and be done. A smart view is a selection with no list behind it, so the union grows a second variant.

Add both to `src/types.ts`:

```diff
+export type SmartView = "all" | "today" | "important" | "trash";
+
-export type Selection = { kind: "list"; listId: string };
+export type Selection = { kind: "smart"; view: SmartView } | { kind: "list"; listId: string };
+
+export type Filter = "all" | "open" | "done";
```

`Filter` lands in the same edit because the header gets a filter later in this chapter.

That one-line change to `Selection` breaks three expressions scattered across three components: the sidebar compared `selection.listId` to decide which row is active, the window read the list's name for the content page title, and the task list read `selection.listId` to decide which list a new task joins. Each of those has to answer for both variants now, and none of them is really a component's business. They are questions about your data.

## Derived data belongs in a function

Create `src/store/selectors.ts`:

```ts
import { isToday } from "../format.js";
import type { Filter, Selection, SmartView, Task, TaskList } from "../types.js";

const SMART_TITLES: Record<SmartView, string> = {
    all: "All Tasks",
    today: "Today",
    important: "Important",
    trash: "Trash",
};

export const selectionKey = (selection: Selection): string =>
    selection.kind === "smart" ? `smart:${selection.view}` : `list:${selection.listId}`;

export const selectionTitle = (selection: Selection, lists: TaskList[]): string =>
    selection.kind === "list"
        ? (lists.find((list) => list.id === selection.listId)?.name ?? "Tasks")
        : SMART_TITLES[selection.view];

export const addListId = (selection: Selection, lists: TaskList[]): string =>
    selection.kind === "list" ? selection.listId : (lists[0]?.id ?? "");
```

`selectionKey` gives a selection a single comparable string, so two selections are the same when their keys match. `selectionTitle` names the current view. `addListId` answers the question a smart view raises: you are looking at Today and you type a new task, so which list does it join? The first one, and a task always belongs to exactly one list.

Now the views themselves. Append the predicates and `visibleTasks` to the same file:

```ts
// ...

const inSelection = (task: Task, selection: Selection): boolean => {
    if (selection.kind === "list") return !task.deleted && task.listId === selection.listId;
    switch (selection.view) {
        case "all":
            return !task.deleted;
        case "today":
            return !task.deleted && isToday(task.due);
        case "important":
            return !task.deleted && task.important;
        case "trash":
            return task.deleted;
    }
};

const matchesQuery = (task: Task, query: string): boolean => {
    if (!query) return true;
    const needle = query.toLowerCase();
    return task.title.toLowerCase().includes(needle) || task.notes.toLowerCase().includes(needle);
};

const matchesFilter = (task: Task, filter: Filter): boolean => {
    if (filter === "open") return !task.done;
    if (filter === "done") return task.done;
    return true;
};

export type VisibleOptions = { query: string; filter: Filter };

export const visibleTasks = (tasks: Task[], selection: Selection, options: VisibleOptions): Task[] =>
    tasks
        .filter(
            (task) =>
                inSelection(task, selection) &&
                matchesQuery(task, options.query) &&
                matchesFilter(task, options.filter),
        )
        .sort((a, b) => a.position - b.position);
```

Three independent questions compose into one visible list. Trash is the only view that shows deleted tasks, and it is the only one that ignores the `deleted` flag rather than excluding on it. The `switch` has no `default` branch on purpose: add a fifth smart view to the union and TypeScript reports this function as no longer returning on every path, which is exactly where you want to be told.

`.filter` returns a fresh array, so sorting it in place is safe. Position is the manual order a task carries, and it is the only ordering available for now. Sorting by due date or title arrives with the preferences in [Preferences and the System Theme](/tutorial/preferences-and-theming); you do not need to think about it yet.

`isToday` is the one piece of that which is about dates rather than tasks, so it goes in `src/format.ts` beside `escapeMarkup`:

```ts
// ...

const startOfDay = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const isToday = (iso: string | null): boolean => {
    if (!iso) return false;
    return startOfDay(new Date(iso)) === startOfDay(new Date());
};
```

Tasks store dates as ISO strings, so both sides are normalized to the local midnight before they are compared. A task due at 6:00 PM today and a task due at 8:00 AM today are both due today.

## How to read derived data from the store

This is the one zustand subtlety in the tutorial, and it is worth stating as a rule rather than discovering as a bug.

Components select the stable arrays and call these functions during render:

```tsx
const tasks = useStore((state) => state.tasks);
const lists = useStore((state) => state.lists);

const visible = visibleTasks(tasks, selection, { query: searchQuery, filter });
```

The tempting alternative is to move that work into the selector, and it is the wrong move. A selector runs on every store change, and zustand compares the result it returns with `Object.is` to decide whether to re-render. `state.tasks` is the same array object until something writes to it, so the comparison holds. A selector that builds a fresh array or object every time it runs never compares equal to its own previous result, so that component re-renders on every change to any part of the store.

::: warning
**Every keystroke re-renders the whole window?** Look for a `useStore` call whose selector constructs something: `useStore((state) => state.tasks.filter(...))`, or `useStore((state) => ({ a: state.a, b: state.b }))`. Select the field, derive after.
:::

::: details When should I reach for useShallow?
`useShallow` wraps a selector and compares the result one level deep instead of by identity, which rescues the flat case:

```tsx
import { useShallow } from "zustand/react/shallow";

const ids = useStore(useShallow((state) => state.tasks.map((task) => task.id)));
```

That array is fresh every call, but its members are strings, so a shallow comparison finds them equal and no re-render happens.

One level deep is the whole limit. The counts object you are about to build carries a nested `lists` record, and that record is a new object on every call, so a shallow comparison would still report a difference every time. That is the reason counts and visible tasks are plain functions over a stably selected array rather than selectors. The [zustand guide to selecting multiple values](https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow) covers the rest.
:::

## Counting what is still open

A sidebar row that says how much work is waiting is the reason people trust the sidebar. Add the counts to `src/store/selectors.ts`:

```ts
// ...

export type SidebarCounts = {
    all: number;
    today: number;
    important: number;
    trash: number;
    lists: Record<string, number>;
};

export const sidebarCounts = (tasks: Task[], lists: TaskList[]): SidebarCounts => {
    const open = tasks.filter((task) => !task.deleted && !task.done);
    return {
        all: open.length,
        today: open.filter((task) => isToday(task.due)).length,
        important: open.filter((task) => task.important).length,
        trash: tasks.filter((task) => task.deleted).length,
        lists: Object.fromEntries(
            lists.map((list) => [list.id, open.filter((task) => task.listId === list.id).length]),
        ),
    };
};
```

The counting rule, once: every badge counts open work, so completing a task lowers it. Trash is the exception and counts everything in it, because a badge on Trash answers "is there anything in here" rather than "is there anything left to do".

## Putting the views in the sidebar

The sidebar no longer maps `lists` directly. It builds a list of entries, with the smart views wrapped around the user's lists, and each entry carrying whichever prefix it needs.

Add the entry shape and its builder to the top of `src/components/sidebar.tsx`:

```tsx
// ...

type Entry = {
    selection: Selection;
    title: string;
    icon?: string;
    color?: string;
    count: number;
};

const buildEntries = (lists: TaskList[], counts: SidebarCounts): Entry[] => [
    { selection: { kind: "smart", view: "all" }, title: "All Tasks", icon: "view-list-symbolic", count: counts.all },
    {
        selection: { kind: "smart", view: "today" },
        title: "Today",
        icon: "x-office-calendar-symbolic",
        count: counts.today,
    },
    {
        selection: { kind: "smart", view: "important" },
        title: "Important",
        icon: "starred-symbolic",
        count: counts.important,
    },
    ...lists.map(
        (list): Entry => ({
            selection: { kind: "list", listId: list.id },
            title: list.name,
            color: list.color,
            count: counts.lists[list.id] ?? 0,
        }),
    ),
    { selection: { kind: "smart", view: "trash" }, title: "Trash", icon: "user-trash-symbolic", count: counts.trash },
];
```

Trash sits last because that is where GNOME puts it. The icon names are the standard symbolic ones your icon theme already ships, so they need no assets from you.

The component reads the arrays, derives the entries, and finds the active row by key:

```tsx
// ...

export const Sidebar = () => {
    const tasks = useStore((state) => state.tasks);
    const lists = useStore((state) => state.lists);
    const selection = useStore((state) => state.selection);
    const select = useStore((state) => state.select);

    const entries = buildEntries(lists, sidebarCounts(tasks, lists));
    const activeIndex = entries.findIndex((entry) => selectionKey(entry.selection) === selectionKey(selection));
    const listRef = useRef<Gtk.ListBox | null>(null);

    useEffect(() => {
        const box = listRef.current;
        if (!box || activeIndex < 0) return;
        const row = box.getRowAtIndex(activeIndex);
        if (row) box.selectRow(row);
    }, [activeIndex]);

    // ...
};
```

That effect and its early-return guard are the same agreement between GTK4's own selection and the store you wrote in [Lists and a Sidebar](/tutorial/lists-and-the-sidebar). What changed is only the comparison: keys instead of list ids.

The row's `onRowSelected` compares by key for the same reason:

```tsx
// ...

<GtkListBox
    ref={listRef}
    cssClasses={["navigation-sidebar"]}
    onRowSelected={(row) => {
        if (!row) return;
        const entry = entries[row.getIndex()];
        if (entry && selectionKey(entry.selection) !== selectionKey(selection)) select(entry.selection);
    }}
>
```

Each row now picks its prefix and grows a badge:

```tsx
// ...

{entries.map((entry) => (
    <AdwActionRow
        key={selectionKey(entry.selection)}
        title={entry.title}
        prefix={
            entry.color ? (
                <GtkBox
                    valign={Gtk.Align.CENTER}
                    cssClasses={[listDot(entry.color)]}
                    accessibleRole={Gtk.AccessibleRole.PRESENTATION}
                />
            ) : (
                <GtkImage iconName={entry.icon} />
            )
        }
        suffix={
            entry.count > 0 ? (
                <GtkLabel valign={Gtk.Align.CENTER} cssClasses={["dimmed", "numeric"]}>
                    {String(entry.count)}
                </GtkLabel>
            ) : undefined
        }
    />
))}
```

The badge carries two Adwaita style classes. `dimmed` drops it out of the way of the row title, since a count is secondary information. `numeric` asks the font for tabular figures, where every digit occupies the same width, so a badge going from 9 to 10 to 9 does not make the row jitter. A count of zero renders no badge at all: a slot given `undefined` mounts nothing.

The imports the file needs now:

```diff
 import * as Gtk from "@gtkx/gi/gtk";
 import { AdwActionRow } from "@gtkx/jsx/adw";
-import { GtkBox, GtkListBox, GtkScrolledWindow } from "@gtkx/jsx/gtk";
+import { GtkBox, GtkImage, GtkLabel, GtkListBox, GtkScrolledWindow } from "@gtkx/jsx/gtk";
 import { useEffect, useRef } from "react";
 import { useStore } from "../store/index.js";
+import { type SidebarCounts, selectionKey, sidebarCounts } from "../store/selectors.js";
 import { listDot } from "../styles.js";
-import type { TaskList } from "../types.js";
+import type { Selection, TaskList } from "../types.js";
```

The window's content page title takes the same treatment, in `src/components/window.tsx`:

```diff
+import { selectionTitle } from "../store/selectors.js";
-<AdwNavigationPage title={lists.find((list) => list.id === selection.listId)?.name ?? "Tasks"}>
+<AdwNavigationPage title={selectionTitle(selection, lists)}>
```

## Filtering the visible list

A view answers "which tasks", and a filter answers "in what state". They are different questions, so they get different controls: the view is the sidebar, the filter is the header.

Add it to the UI slice in `src/store/ui.ts`:

```diff
 export type UiSlice = {
     selection: Selection;
     collapsed: boolean;
     showContent: boolean;
+    filter: Filter;
     select: (selection: Selection) => void;
+    setFilter: (filter: Filter) => void;
 };
```

```diff
     collapsed: false,
     showContent: false,
+    filter: "all",
+    setFilter: (filter) => set({ filter }),
```

`Filter` joins the type import from `../types.js`.

This is where the tutorial draws a line it holds to the end. The filter is what the interface is currently doing, so it lives in the UI slice, which `partialize` excludes, and it starts at All on every launch. The sort order you meet in [Preferences and the System Theme](/tutorial/preferences-and-theming) is a preference the user chose about the application, so it goes to GSettings and persists. Ask which one a piece of state is before deciding where to put it.

The control is an `AdwToggleGroup`, which is the Adwaita segmented control, as the header bar's title widget in `src/components/content-pane.tsx`:

```tsx
// ...

<AdwHeaderBar
    titleWidget={
        <AdwToggleGroup
            activeName={filter}
            cssClasses={["round"]}
            onNotifyActiveName={(name) => {
                if (name === "all" || name === "open" || name === "done") setFilter(name);
            }}
        >
            <AdwToggle name="all" label="All" />
            <AdwToggle name="open" label="Open" />
            <AdwToggle name="done" label="Done" />
        </AdwToggleGroup>
    }
/>
```

Each `AdwToggle` carries a `name`, and the group reports whichever one is active through its `active-name` property. Reading `activeName` from the store and writing it back from `onNotifyActiveName` is the controlled-widget pairing you already used for the checkbox and for the split view: the value prop says what should be shown, the signal reports what the widget did.

The guard exists because `onNotify` handlers hand you the raw property value, which is `string | null` here. `Filter` is a narrower type than `string`, so the check is what earns the assignment. That comparison is a genuine type guard, which is why no cast appears anywhere in this file.

Then pass the filter through in `src/components/task-list.tsx`:

```diff
+const filter = useStore((state) => state.filter);
+
-const visible = tasks.filter((task) => !task.deleted && task.listId === selection.listId);
+const visible = visibleTasks(tasks, selection, { query: searchQuery, filter });
```

## Searching titles and notes

`matchesQuery` is already written and already wired into `visibleTasks`. What is missing is somewhere to type.

Two more fields in `src/store/ui.ts`:

```diff
+    searchMode: boolean;
+    searchQuery: string;
+    setSearchMode: (searchMode: boolean) => void;
+    setSearchQuery: (searchQuery: string) => void;
```

```diff
+    searchMode: false,
+    searchQuery: "",
+    setSearchMode: (searchMode) => set({ searchMode }),
+    setSearchQuery: (searchQuery) => set({ searchQuery }),
```

`searchMode` is whether the bar is revealed and `searchQuery` is what is in it. They are separate because closing the bar has to clear the query, and `select` is where that happens: switching views with a stale search still applied would show an empty pane for no visible reason.

```diff
     select: (selection) =>
         set((state) => ({
             selection,
+            searchMode: false,
+            searchQuery: "",
             showContent: state.collapsed,
         })),
```

The bar itself goes above the scroller in `src/components/task-list.tsx`, so it pushes the list down rather than floating over it:

```tsx
// ...

<GtkBox orientation={Gtk.Orientation.VERTICAL} vexpand>
    <GtkSearchBar
        searchModeEnabled={searchMode}
        onNotifySearchModeEnabled={(enabled) => setSearchMode(enabled ?? false)}
    >
        <GtkSearchEntry
            placeholderText="Search tasks…"
            text={searchQuery}
            onSearchChanged={(self) => setSearchQuery(self.text)}
        />
    </GtkSearchBar>
    <GtkScrolledWindow vexpand>
        {/* ... */}
    </GtkScrolledWindow>
</GtkBox>
```

`GtkSearchBar` is a revealer with GNOME's search behavior built in, including dismissal on Escape. That dismissal is exactly why `searchModeEnabled` is paired with `onNotifySearchModeEnabled`: the bar closes itself, and if that never reached the store the next render would reopen it. `?? false` is there because the notify value is nullable.

`GtkSearchEntry` emits `search-changed` on a short delay rather than on every keystroke, so a long query does not refilter the array once per character.

The button that reveals it goes in the header bar, next to the filter, in `src/components/content-pane.tsx`:

```tsx
// ...

start={
    <GtkButton
        iconName="system-search-symbolic"
        tooltipText="Search (Ctrl+F)"
        onClicked={() => setSearchMode(!searchMode)}
    />
}
```

The tooltip promises a keyboard shortcut you have not built. It arrives in [Menus, Accelerators, and Shortcuts](/tutorial/actions-menus-shortcuts), along with every other key the app answers.

One more line, in the same file: give the task list a key derived from the selection, so switching views mounts a fresh list rather than reusing the old one with its scroll position half way down.

```diff
-<TaskList />
+<TaskList key={selectionKey(selection)} />
```

## When there is nothing to show

An empty pane with a card and a lone add row is the app's least helpful state, and there are several different reasons to be in it. A search with no results is not the same situation as an empty Trash, and the wording should say so.

Add the mapping to the end of `src/store/selectors.ts`:

```ts
// ...

export type EmptyState = { icon: string; title: string; description: string };

const SMART_EMPTY: Record<SmartView, EmptyState> = {
    all: { icon: "view-list-symbolic", title: "No Tasks Yet", description: "Add a task above to get started" },
    today: {
        icon: "x-office-calendar-symbolic",
        title: "Nothing Due Today",
        description: "Tasks due today appear here",
    },
    important: { icon: "starred-symbolic", title: "No Important Tasks", description: "Star a task to find it here" },
    trash: { icon: "user-trash-symbolic", title: "Trash Is Empty", description: "Deleted tasks appear here" },
};

export const emptyState = (selection: Selection, query: string): EmptyState => {
    if (query) return { icon: "system-search-symbolic", title: "No Results", description: `No tasks match “${query}”` };
    if (selection.kind === "smart") return SMART_EMPTY[selection.view];
    return SMART_EMPTY.all;
};
```

A query outranks the view, because when you searched and found nothing, the search is what you want explained. A user list with nothing in it borrows the All Tasks wording, since the advice is the same.

Render it below the list box in `src/components/task-list.tsx`, inside a vertical box so the two stack inside the clamp:

```tsx
// ...

<GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
    <GtkListBox selectionMode={Gtk.SelectionMode.NONE} cssClasses={["boxed-list"]}>
        {/* ... */}
    </GtkListBox>
    {visible.length === 0 ? (
        <AdwStatusPage
            cssClasses={["compact"]}
            iconName={empty.icon}
            title={empty.title}
            description={empty.description}
        />
    ) : null}
</GtkBox>
```

`AdwStatusPage` is the same component that filled the window in [Your First Window](/tutorial/your-first-window). The `compact` style class shrinks its icon and type scale so it reads as a note under a card rather than as the whole screen. The card stays mounted above it, because the add row lives in it and typing a task is the thing you most want to do from an empty view.

The task list now derives all three of its values at the top of the component:

```tsx
// ...

const visible = visibleTasks(tasks, selection, { query: searchQuery, filter });
const empty = emptyState(selection, searchQuery);
const listId = addListId(selection, lists);
```

Three pure functions over two selected arrays. No new state, and nothing written to disk.

## Run it

```bash
npm run dev
```

The sidebar opens on All Tasks and shows All Tasks, Today, Important, your lists, and Trash, each with a count of open work on the right. Four observations:

- Tick **Water the plants**. The badges on All Tasks, Today, Important, and Personal all drop by one, in the same frame.
- Click **Today**. Only tasks due today are listed. Click **Trash**, and the task you deleted in an earlier chapter is there, along with a badge counting it.
- Set the header filter to **Done**, and the list narrows to completed tasks. Set it to **Open** and they disappear. Switch to another view and the filter stays where you put it; quit and start again and it is back on All.
- Click the search button and type `report`. The list narrows as you type. Type `zzz`: the card empties and the note reads **No Results**, with your query quoted back. Clear the search and click **Trash** with nothing in it, and the note reads **Trash Is Empty** instead.

## Checkpoint

The complete `src/store/selectors.ts`:

```ts
import { isToday } from "../format.js";
import type { Filter, Selection, SmartView, Task, TaskList } from "../types.js";

const SMART_TITLES: Record<SmartView, string> = {
    all: "All Tasks",
    today: "Today",
    important: "Important",
    trash: "Trash",
};

export const selectionKey = (selection: Selection): string =>
    selection.kind === "smart" ? `smart:${selection.view}` : `list:${selection.listId}`;

export const selectionTitle = (selection: Selection, lists: TaskList[]): string =>
    selection.kind === "list"
        ? (lists.find((list) => list.id === selection.listId)?.name ?? "Tasks")
        : SMART_TITLES[selection.view];

export const addListId = (selection: Selection, lists: TaskList[]): string =>
    selection.kind === "list" ? selection.listId : (lists[0]?.id ?? "");

const inSelection = (task: Task, selection: Selection): boolean => {
    if (selection.kind === "list") return !task.deleted && task.listId === selection.listId;
    switch (selection.view) {
        case "all":
            return !task.deleted;
        case "today":
            return !task.deleted && isToday(task.due);
        case "important":
            return !task.deleted && task.important;
        case "trash":
            return task.deleted;
    }
};

const matchesQuery = (task: Task, query: string): boolean => {
    if (!query) return true;
    const needle = query.toLowerCase();
    return task.title.toLowerCase().includes(needle) || task.notes.toLowerCase().includes(needle);
};

const matchesFilter = (task: Task, filter: Filter): boolean => {
    if (filter === "open") return !task.done;
    if (filter === "done") return task.done;
    return true;
};

export type VisibleOptions = { query: string; filter: Filter };

export const visibleTasks = (tasks: Task[], selection: Selection, options: VisibleOptions): Task[] =>
    tasks
        .filter(
            (task) =>
                inSelection(task, selection) &&
                matchesQuery(task, options.query) &&
                matchesFilter(task, options.filter),
        )
        .sort((a, b) => a.position - b.position);

export type SidebarCounts = {
    all: number;
    today: number;
    important: number;
    trash: number;
    lists: Record<string, number>;
};

export const sidebarCounts = (tasks: Task[], lists: TaskList[]): SidebarCounts => {
    const open = tasks.filter((task) => !task.deleted && !task.done);
    return {
        all: open.length,
        today: open.filter((task) => isToday(task.due)).length,
        important: open.filter((task) => task.important).length,
        trash: tasks.filter((task) => task.deleted).length,
        lists: Object.fromEntries(
            lists.map((list) => [list.id, open.filter((task) => task.listId === list.id).length]),
        ),
    };
};

export type EmptyState = { icon: string; title: string; description: string };

const SMART_EMPTY: Record<SmartView, EmptyState> = {
    all: { icon: "view-list-symbolic", title: "No Tasks Yet", description: "Add a task above to get started" },
    today: {
        icon: "x-office-calendar-symbolic",
        title: "Nothing Due Today",
        description: "Tasks due today appear here",
    },
    important: { icon: "starred-symbolic", title: "No Important Tasks", description: "Star a task to find it here" },
    trash: { icon: "user-trash-symbolic", title: "Trash Is Empty", description: "Deleted tasks appear here" },
};

export const emptyState = (selection: Selection, query: string): EmptyState => {
    if (query) return { icon: "system-search-symbolic", title: "No Results", description: `No tasks match “${query}”` };
    if (selection.kind === "smart") return SMART_EMPTY[selection.view];
    return SMART_EMPTY.all;
};
```

## Summary

- **Smart views are queries, not data.** Today, Important, and Trash are predicates over the array you already had, so this chapter added five interface features and zero persisted fields.
- **Derived values are pure functions called during render.** Components select the stable arrays and pass them in. A selector that builds a fresh array or object defeats `Object.is` and re-renders on every store change, and `useShallow` rescues only flat results.
- **A discriminated union pays you back at the compiler.** Adding `SmartView` to `Selection` pointed at every place that assumed a list, and the exhaustive `switch` will do it again for the next variant.
- **View state and preferences are different things.** The filter and the search query live in the UI slice and start fresh, because they describe what the interface is doing right now.
- **A controlled widget is a value prop plus its notify signal.** The toggle group and the search bar follow the same pairing as the checkbox and the split view, and `onNotify` values arrive nullable.
- **An empty state should explain itself.** Mapping the current view and query to an icon, a title, and a description costs one function and makes an empty pane readable.

## Next

[Opening a Task](/tutorial/the-task-editor) turns the content pane into an editor, where a task grows notes, a due date picked from a calendar, and an Important switch.
