---
description: "The Tasks data layer, with JSON in the XDG data directory through node:fs, GSettings for preferences, and React state as the source of truth."
---

# Data Model and Persistence

Tasks keeps its data in separate stores: task content as one JSON file in the XDG data directory, and small UI preferences (filter, sort order, color scheme, window size) in GSettings. This page walks that data layer end to end: `types.ts` (the shapes), `store.ts` (JSON load and save), the `useTasks` hook (state plus every mutation), and the gschema that defines the preference keys.

React state is the single source of truth while the app runs. Both stores are only where that state is serialized to and rehydrated from.

## The shapes

`src/types.ts` is the whole domain model. A `Task` is a flat, JSON-friendly record. A `TaskList` is an id, a display name, and a color string used for the sidebar dot. Notice there are no live GTK4 objects here, and no `Date` instances: `due`, `createdAt`, and `completedAt` are ISO-8601 strings (`due` and `completedAt` may be `null`) so the record survives `JSON.stringify` untouched.

```ts
export type TaskList = {
    id: string;
    name: string;
    color: string;
};

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

`position` and `deleted` matter later. `position` is the manual sort index that drag-to-reorder rewrites. `deleted` is a soft-delete flag: trashing a task flips `deleted` to `true` rather than removing it, which is what makes the Trash smart view and the undo toast possible without a second data structure.

The remaining types describe what the sidebar has selected, not stored data. A `Selection` is a discriminated union: either one of the built-in smart views or a specific user list by id.

```ts
export type SmartView = "all" | "today" | "important" | "trash";

export type Selection = { kind: "smart"; view: SmartView } | { kind: "list"; listId: string };
```

## Paths: the XDG data directory

`src/store.ts` owns everything that touches disk, and it is plain Node.js. It starts by building the file path with `node:path` and `node:os`, following the XDG Base Directory specification so the app writes to the correct per-user location instead of littering the home directory.

```ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Task, TaskList } from "./types.js";

const APP_ID = "com.gtkx.tutorial";
const DATA_HOME = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
const DATA_DIR = join(DATA_HOME, APP_ID);
const TASKS_PATH = join(DATA_DIR, "tasks.json");
const SCHEMA_VERSION = 1;

export type PersistedState = {
    version: number;
    lists: TaskList[];
    tasks: Task[];
};
```

The XDG spec says per-user data files belong under `$XDG_DATA_HOME`, and that an unset or empty variable means `~/.local/share`, which is exactly what the `||` fallback expresses. Namespacing by the application ID puts the file at `~/.local/share/com.gtkx.tutorial/tasks.json`, where GNOME conventions expect it. Because the code honors `$XDG_DATA_HOME`, sandboxed packaging redirects it automatically: Flatpak points the variable at the app's private data directory. `PersistedState` is the exact JSON envelope: a `version` number for migration, plus the `lists` and `tasks` arrays.

## First run: the seed

When there is no file yet, the app has to start from something. `seed()` returns a `PersistedState` with example lists and tasks, so a fresh install opens onto a populated list instead of an empty screen. `isoInDays` builds due dates relative to today (18:00), and `make` fills in the boilerplate fields so each task literal only spells out what differs.

```ts
const seed = (): PersistedState => {
    const now = new Date().toISOString();
    const lists: TaskList[] = [
        { id: "personal", name: "Personal", color: "#3584e4" },
        { id: "work", name: "Work", color: "#2ec27e" },
        { id: "shopping", name: "Shopping", color: "#e66100" },
    ];
    const make = (task: Partial<Task> & Pick<Task, "id" | "listId" | "title" | "position">): Task => ({
        notes: "",
        done: false,
        important: false,
        deleted: false,
        due: null,
        createdAt: now,
        completedAt: null,
        ...task,
    });
    const tasks: Task[] = [
        make({
            id: "t1",
            listId: "personal",
            title: "Welcome to Tasks",
            position: 0,
            notes: "This is your first task. Tick the checkbox to complete it, or open it to add notes and a due date.",
        }),
        make({
            id: "t2",
            listId: "personal",
            title: "Water the plants",
            position: 1,
            due: isoInDays(0),
            important: true,
        }),
        // ...
    ];
    return { version: SCHEMA_VERSION, lists, tasks };
};
```

The color values (`#3584e4`, `#2ec27e`, `#e66100`) are from GNOME's standard color palette, so the seeded lists match the platform look.

## Loading: seed, corruption, and version guard in one function

`loadState` handles every way loading can go wrong (no file, unreadable file, garbage or stale contents) and always returns a valid `PersistedState`. This matters because it runs as the lazy `useState` initializer: if it threw, the whole app would fail to mount.

```ts
export const loadState = (): PersistedState => {
    try {
        if (!existsSync(TASKS_PATH)) return seed();
        const parsed = JSON.parse(readFileSync(TASKS_PATH, "utf8")) as PersistedState;
        if (parsed?.version !== SCHEMA_VERSION) return seed();
        return parsed;
    } catch {
        return seed();
    }
};
```

Read it top to bottom as a chain of guards:

- `existsSync` catches the first run: no file yet, so seed.
- The `try/catch` covers everything that can throw: `readFileSync` on an unreadable file (permission problems, a directory in the way) and `JSON.parse` on truncated or corrupt contents. Either way the app falls through to the same seed instead of crashing at startup.
- `parsed?.version !== SCHEMA_VERSION` rejects data written by a future or incompatible schema. Bump `SCHEMA_VERSION` and add migration branches here when the shape changes; today anything that does not match reseeds.

## Saving: one atomic write

`saveState` ensures the directory exists, then writes the pretty-printed JSON through a temporary file.

```ts
export const saveState = (state: PersistedState): void => {
    mkdirSync(DATA_DIR, { recursive: true });
    const tempPath = `${TASKS_PATH}.tmp`;
    writeFileSync(tempPath, JSON.stringify(state, null, 2));
    renameSync(tempPath, TASKS_PATH);
};
```

`mkdirSync` with `recursive: true` creates the namespaced directory (and any missing parent) on first save, and does nothing when it already exists. The temp-then-rename pair is the important part for durability.

::: info Write-then-rename is atomic
A plain `writeFileSync` straight to `tasks.json` truncates the file before writing, so a crash or `SIGKILL` mid-write could leave it half-written. Writing the new contents to a temporary file and then `renameSync`-ing it over the target closes that window: on POSIX systems, `rename(2)` within one filesystem atomically replaces the destination. A reader always sees either the complete old file or the complete new one, never a torn write.

The temp file must sit in the same directory as the target, because `rename(2)` cannot cross filesystems (`renameSync` fails with `EXDEV`).
:::

## The hook: state plus every mutation

`src/hooks/use-tasks.ts` is where the store meets React. `useTasks` holds the entire `PersistedState` in one `useState`, seeds it lazily from disk, and returns a flat API of mutation functions. Every component that changes data calls one of these; nothing else touches `store.ts`.

```ts
import { useEffect, useState } from "react";
import { loadState, type PersistedState, saveState } from "../store.js";
import type { Task } from "../types.js";

const reindex = (tasks: Task[]): Task[] => tasks.map((task, index) => ({ ...task, position: index }));

const now = (): string => new Date().toISOString();

export type TasksApi = ReturnType<typeof useTasks>;

export const useTasks = () => {
    const [state, setState] = useState<PersistedState>(loadState);
    // ...
};
```

Passing `loadState` (the function reference, not `loadState()`) is the lazy-initializer form: React calls it exactly once, on mount. The disk read never happens again on re-render. `TasksApi` is derived with `ReturnType<typeof useTasks>`, so the API type stays in sync with the implementation automatically.

### The debounced save effect

There is no explicit "save" button and no save call inside the actions. Instead, one effect watches `state` and writes it 500ms after the last change:

```ts
useEffect(() => {
    const handle = setTimeout(() => saveState(state), 500);
    return () => clearTimeout(handle);
}, [state]);
```

Because `state` is in the dependency array, every mutation reschedules the timer: the cleanup clears the previous `setTimeout` and a new one starts. A burst of edits collapses into a single disk write 500ms after the user stops. This is the crash safety net: a crash loses only the edits made since the last completed write.

### Helpers behind the actions

A few tiny helpers keep the individual mutations one-liners. `mutate` swaps in a new `tasks` array while preserving the rest of the state; `patch` merges fields into the one task whose id matches.

```ts
const mutate = (updater: (tasks: Task[]) => Task[]): void =>
    setState((current) => ({ ...current, tasks: updater(current.tasks) }));

const patch = (id: string, fields: Partial<Task>): void =>
    mutate((tasks) => tasks.map((task) => (task.id === id ? { ...task, ...fields } : task)));

const withDone = (task: Task, done: boolean): Task => ({
    ...task,
    done,
    completedAt: done ? now() : null,
});
```

`withDone` keeps `done` and `completedAt` consistent: completing a task stamps `completedAt`, un-completing it clears the stamp back to `null`.

### Adding

`addTask` trims the title and returns `null` if it is empty, so a blank entry row is a no-op. It mints an id with the Web Crypto `crypto.randomUUID()`, appends the task at `position: tasks.length`, and returns the new id so the caller can open the task immediately.

```ts
const addTask = (listId: string, title: string): string | null => {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const id = crypto.randomUUID();
    mutate((tasks) => [
        ...tasks,
        {
            id,
            listId,
            title: trimmed,
            notes: "",
            done: false,
            important: false,
            deleted: false,
            due: null,
            position: tasks.length,
            createdAt: now(),
            completedAt: null,
        },
    ]);
    return id;
};

const addList = (name: string, color: string): void => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((current) => ({
        ...current,
        lists: [...current.lists, { id: crypto.randomUUID(), name: trimmed, color }],
    }));
};
```

`addList` is the parallel for lists; it edits `current.lists` directly (not through `mutate`, which only touches `tasks`).

### Editing a single task

```ts
const setDone = (id: string, done: boolean): void =>
    mutate((tasks) => tasks.map((task) => (task.id === id ? withDone(task, done) : task)));

const toggleDone = (id: string): void =>
    mutate((tasks) => tasks.map((task) => (task.id === id ? withDone(task, !task.done) : task)));

const setImportant = (id: string, important: boolean): void => patch(id, { important });

const updateTask = (id: string, fields: Partial<Pick<Task, "title" | "notes" | "due" | "listId">>): void =>
    patch(id, fields);
```

`setDone` and `toggleDone` go through `withDone` to keep the completion timestamp honest. `updateTask` is the editor's catch-all: its `fields` type is narrowed to just the user-editable fields, so the form cannot accidentally patch `done` or `position`.

### Trash, restore, delete

Soft delete and hard delete are different operations. `moveToTrash` and `restore` only flip the `deleted` flag, keeping the task recoverable and undoable. `deleteForever` is the only one that actually removes the record from the array.

```ts
const moveToTrash = (id: string): void => patch(id, { deleted: true });

const restore = (id: string): void => patch(id, { deleted: false });

const deleteForever = (id: string): void => mutate((tasks) => tasks.filter((task) => task.id !== id));
```

### Batch operations

Selection mode acts on many tasks at once. Each of these takes an array of ids and maps over the tasks, applying the change where `ids.includes(task.id)`:

```ts
const moveToList = (ids: string[], listId: string): void =>
    mutate((tasks) => tasks.map((task) => (ids.includes(task.id) ? { ...task, listId } : task)));

const completeMany = (ids: string[]): void =>
    mutate((tasks) => tasks.map((task) => (ids.includes(task.id) ? withDone(task, true) : task)));

const trashMany = (ids: string[]): void =>
    mutate((tasks) => tasks.map((task) => (ids.includes(task.id) ? { ...task, deleted: true } : task)));
```

### Reorder with reindex

Drag-to-reorder moves a task from its current slot to the drop target's index, then rewrites every `position` to match the new array order. `reindex` (defined at the top of the file) is what makes `position` a live, persisted value rather than dead state.

```ts
const reorder = (draggedId: string, targetId: string): void =>
    mutate((tasks) => {
        const from = tasks.findIndex((task) => task.id === draggedId);
        const to = tasks.findIndex((task) => task.id === targetId);
        if (from === -1 || to === -1 || from === to) return tasks;
        const next = [...tasks];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return reindex(next);
    });
```

Returning the original `tasks` array unchanged when the indices are missing or equal skips the splice and reindex work for a no-op drag.

### What the hook returns

```ts
return {
    lists: state.lists,
    tasks: state.tasks,
    addTask,
    setDone,
    toggleDone,
    setImportant,
    updateTask,
    moveToTrash,
    restore,
    deleteForever,
    moveToList,
    completeMany,
    trashMany,
    reorder,
    addList,
    flush,
};
```

Every name here is defined above except `flush`, covered next.

## Flush on close

The 500ms debounce is a safety net, not a clean exit. On a normal quit the app should not lose the last edit sitting inside a pending timer, so the hook also exposes a synchronous `flush`:

```ts
const flush = (): void => saveState(state);
```

`flush` runs `saveState` immediately, bypassing the debounce, so the file on disk always reflects the last state before the process exits. The window's close handler calls it before quitting, wired through `onCloseRequest` in [The Application Shell](/tutorial/app-shell#the-window).

## The other store: GSettings for UI preferences

Task data is JSON; UI preferences are GSettings. GSettings is GNOME's schema-defined settings database, backed by dconf. It is the right home for small, discrete values, because `Gio.Settings` can bind a key straight to any GObject property, including the properties of GTK4 and Adwaita widgets. It is the wrong home for the task list: dconf is not meant for large or frequently-churned blobs.

The preference keys are declared in `data/com.gtkx.tutorial.gschema.xml`. Each key has a type, an optional constraint, a default, and human-readable summary/description text.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<schemalist>
  <enum id="com.gtkx.tutorial.SortOrder">
    <value nick="manual" value="0"/>
    <value nick="due-date" value="1"/>
    <value nick="title" value="2"/>
    <value nick="created" value="3"/>
  </enum>
  <schema id="com.gtkx.tutorial" path="/com/gtkx/tutorial/">
    <key name="filter" type="s">
      <choices>
        <choice value="all"/>
        <choice value="open"/>
        <choice value="done"/>
      </choices>
      <default>'all'</default>
      <summary>Task filter</summary>
      <description>Which tasks are shown in the list</description>
    </key>
    <key name="sort-order" enum="com.gtkx.tutorial.SortOrder">
      <default>'manual'</default>
      <summary>Sort order</summary>
      <description>How tasks are ordered in the list</description>
    </key>
    <key name="color-scheme" type="s">
      <choices>
        <choice value="default"/>
        <choice value="light"/>
        <choice value="dark"/>
      </choices>
      <default>'default'</default>
      <summary>Color scheme</summary>
      <description>Follow the system theme or force light or dark</description>
    </key>
    <key name="reminder-minutes" type="i">
      <range min="0" max="1440"/>
      <default>30</default>
      <summary>Reminder lead time</summary>
      <description>Minutes before a due time to show a reminder</description>
    </key>
    <key name="window-width" type="i">
      <default>900</default>
      <summary>Window width</summary>
      <description>Last saved window width in pixels</description>
    </key>
    <key name="window-height" type="i">
      <default>600</default>
      <summary>Window height</summary>
      <description>Last saved window height in pixels</description>
    </key>
  </schema>
</schemalist>
```

Some things worth calling out in the schema format:

- **Constrained strings.** `filter` and `color-scheme` inline a `<choices>` list; `sort-order` references a top-level `<enum>` by id via `enum="..."`, and its `<default>` is one of the enum *nicks*, single-quoted. Both forms produce a key GSettings validates against its allowed set, so a write of an undeclared value is rejected.
- **Ranged integer.** `reminder-minutes` is `type="i"` with a `<range min="0" max="1440"/>`, capping the reminder lead time to a day.

Every key here is small, discrete UI state: which filter is active, how the list is sorted, the forced color scheme, reminder lead time, and the last window geometry. None of it is task content. How components read and write these keys with the `useSetting` hook is covered in [Preferences and Theming](/tutorial/preferences-and-theming).

::: info The data layer is plain Node.js
GLib does export file helpers through `@gtkx/gi/glib`, but there is no reason to use them for ordinary IO: the store you just read would drop unchanged into any Node.js project. The same door swings the other way, too: outgrow the JSON file and you can swap `store.ts` for `better-sqlite3` or any other npm package without touching the rest of the app.

This split is the rule of thumb for every GTKX app. Use the Node.js standard library and the npm ecosystem for everything they cover: files, paths, timers, networking, subprocesses, crypto. Reach for the platform libraries only where GNOME provides something Node.js cannot, such as GSettings, desktop notifications, actions, and dialogs.
:::

## Next

Continue to [The Sidebar](/tutorial/the-sidebar), where the `Selection` and `SmartView` types from `types.ts` drive the navigation list, the smart views, and the user's task lists.
