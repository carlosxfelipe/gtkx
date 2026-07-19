---
description: "The Tasks data layer: JSON in the XDG data directory through node:fs, GSettings for preferences, and the useTasks hook."
---

# Data Model and Persistence

Tasks stores task content as JSON in the XDG data directory and UI preferences in GSettings.

## The shapes

`src/types.ts` is the whole domain model. A `Task` is a flat, JSON-friendly record, and a `TaskList` is an id, a display name, and a color string used for the sidebar dot. `due`, `createdAt`, and `completedAt` are ISO-8601 strings, `deleted` is a soft-delete flag, and `position` is the manual sort index that drag-to-reorder rewrites.

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

export type SmartView = "all" | "today" | "important" | "trash";

export type Selection = { kind: "smart"; view: SmartView } | { kind: "list"; listId: string };
```

## The store

`src/store.ts` owns everything that touches disk. It builds the file path from `$XDG_DATA_HOME` (falling back to `~/.local/share`) namespaced by the application ID, so Flatpak redirects the store to the app's private data directory automatically.

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

### Loading

`loadState` handles every way loading can go wrong (no file, unreadable file, garbage or stale contents) and always returns a valid `PersistedState`, falling back to `seed()` with example lists and tasks.

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

Bump `SCHEMA_VERSION` and add migration branches here when the shape changes.

### Saving

```ts
export const saveState = (state: PersistedState): void => {
    mkdirSync(DATA_DIR, { recursive: true });
    const tempPath = `${TASKS_PATH}.tmp`;
    writeFileSync(tempPath, JSON.stringify(state, null, 2));
    renameSync(tempPath, TASKS_PATH);
};
```

The temp-then-rename pair keeps a crash from leaving a half-written file.

## The hook: state plus every mutation

`src/hooks/use-tasks.ts` is where the store meets React. `useTasks` holds the entire `PersistedState` in one `useState`, seeds it lazily from disk, and returns a flat API of mutation functions. Nothing else touches `store.ts`.

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

### The debounced save effect

One effect watches `state` and writes it 500ms after the last change, so a burst of edits collapses into a single disk write.

```ts
useEffect(() => {
    const handle = setTimeout(() => saveState(state), 500);
    return () => clearTimeout(handle);
}, [state]);
```

The hook also exposes a synchronous `flush`, which bypasses the debounce so a clean quit never loses the edit sitting in a pending timer.

```ts
const flush = (): void => saveState(state);
```

### Helpers behind the actions

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

### Mutations

Every action is built from those helpers. `addTask` returns the new id so the caller can open the task immediately, and `addList` edits `current.lists` directly rather than going through `mutate`.

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
            position: tasks.length,
            createdAt: now(),
            // ...
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

```ts
const setDone = (id: string, done: boolean): void =>
    mutate((tasks) => tasks.map((task) => (task.id === id ? withDone(task, done) : task)));

const toggleDone = (id: string): void =>
    mutate((tasks) => tasks.map((task) => (task.id === id ? withDone(task, !task.done) : task)));

const setImportant = (id: string, important: boolean): void => patch(id, { important });

const updateTask = (id: string, fields: Partial<Pick<Task, "title" | "notes" | "due" | "listId">>): void =>
    patch(id, fields);
```

```ts
const moveToTrash = (id: string): void => patch(id, { deleted: true });

const restore = (id: string): void => patch(id, { deleted: false });

const deleteForever = (id: string): void => mutate((tasks) => tasks.filter((task) => task.id !== id));
```

```ts
const moveToList = (ids: string[], listId: string): void =>
    mutate((tasks) => tasks.map((task) => (ids.includes(task.id) ? { ...task, listId } : task)));

const completeMany = (ids: string[]): void =>
    mutate((tasks) => tasks.map((task) => (ids.includes(task.id) ? withDone(task, true) : task)));

const trashMany = (ids: string[]): void =>
    mutate((tasks) => tasks.map((task) => (ids.includes(task.id) ? { ...task, deleted: true } : task)));
```

### Reorder with reindex

Drag-to-reorder moves a task from its current slot to the drop target's index, then rewrites every `position` to match the new array order.

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

## The other store: GSettings for UI preferences

The preference keys are declared in `data/com.gtkx.tutorial.gschema.xml`. Each key has a type, an optional constraint, a default, and human-readable summary and description text.

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
    <key name="reminder-minutes" type="i">
      <range min="0" max="1440"/>
      <default>30</default>
      <summary>Reminder lead time</summary>
      <description>Minutes before a due time to show a reminder</description>
    </key>
    <!-- color-scheme, window-width, window-height -->
  </schema>
</schemalist>
```

A key constrains its values either with an inline `<choices>` list, as `filter` does, or by referencing a top-level `<enum>` by id, as `sort-order` does with a single-quoted enum nick for its `<default>`. Both forms make GSettings reject a write of an undeclared value, and `reminder-minutes` uses a `<range>` to cap the lead time at a day.

How components read and write these keys with the `useSetting` hook is covered in [Preferences and Theming](/tutorial/preferences-and-theming).

## Next

Continue to [The Sidebar](/tutorial/the-sidebar), where the `Selection` type drives the navigation list.
