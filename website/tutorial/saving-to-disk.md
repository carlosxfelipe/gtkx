---
description: "Persist the store to the XDG data directory so tasks survive a restart."
---

# Saving Tasks Between Runs

Your rows are interactive: [the last chapter](/tutorial/completing-and-deleting) gave each one a checkbox, a star, and a delete button, all wired straight to store actions. Every one of those changes lives in memory, so two chapters of typing vanish the moment you quit. This chapter fixes that, and you will not write a single save call to do it.

## Where user data goes

GNOME applications split what they keep into two piles, and Tasks holds that split for the rest of the tutorial.

User content, the stuff a person would be upset to lose, goes in a file under the XDG data directory. Your tasks are user content.

Preferences, the small knobs that describe how the app is set up, go in GSettings. The theme, the sort order, and the reminder lead time are preferences, and they arrive in [Preferences and the System Theme](/tutorial/preferences-and-theming).

The two are different because they fail differently. Losing a preference is an annoyance; losing a task is a bug report. So the tasks get a file you own, written atomically, in a location the desktop already agrees on.

## A storage backend

zustand's `persist` middleware needs somewhere to put bytes. It does not care where, so you give it a small object with `getItem`, `setItem`, and `removeItem`.

Create `src/store/storage.ts`:

```ts
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const directory = join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "com.gtkx.tutorial");
const file = join(directory, "tasks.json");

export const fileStorage = {
    getItem: (): string | null => {
        try {
            return readFileSync(file, "utf8");
        } catch {
            return null;
        }
    },
    setItem: (_name: string, value: string): void => {
        mkdirSync(directory, { recursive: true });
        writeFileSync(`${file}.tmp`, value);
        renameSync(`${file}.tmp`, file);
    },
    removeItem: (): void => rmSync(file, { force: true }),
};
```

That is `node:fs`, `node:os`, and `node:path`, and nothing else. A GTKX app is a Node.js process that happens to drive GTK4, so reach for the Node standard library wherever it covers the job and save GLib and Gio for what is unique to the platform: settings, notifications, D-Bus, and the widget toolkit itself.

Three details in that file earn their keep.

**The path.** `$XDG_DATA_HOME` names the per-user data directory, falling back to `~/.local/share` when the variable is unset, and you namespace it with the application ID you chose when scaffolding. Everything downstream of this line follows for free. The Flatpak in [Appendix C](/tutorial/flatpak) needs no filesystem permission at all, because the sandbox sets `XDG_DATA_HOME` to the app's private directory and your code lands there without knowing. The test setup in [Appendix A](/tutorial/testing) points the same variable at a temporary directory so a test run never touches your real tasks.

**`getItem` swallows the read error.** On a first launch there is no file, and "no file" is not a failure. Returning `null` is exactly what `persist` expects when there is nothing saved yet.

**`setItem` writes to a sibling and renames.** `writeFileSync` on the real path can be interrupted, and an interrupted write leaves a truncated JSON file that will never parse again. `renameSync` within one directory is atomic on Linux, so the file at `tasks.json` is either the whole previous version or the whole new one.

## Turning it on

The store creator you have been growing since [Adding Tasks with a Store](/tutorial/the-task-store) gets wrapped in `persist`. Nothing inside it changes.

The import line in `src/store/index.ts`:

```diff
 import { create } from "zustand";
+import { createJSONStorage, persist } from "zustand/middleware";
```

Then `src/store/index.ts`, with the action bodies left alone:

```ts
// ...

export type PersistedState = { tasks: Task[] };

export const useStore = create<Store>()(
    persist(
        (set) => ({
            tasks: seedTasks,
            // ...
        }),
        {
            name: "tasks",
            version: 1,
            storage: createJSONStorage(() => fileStorage),
            partialize: (state): PersistedState => ({ tasks: state.tasks }),
        },
    ),
);
```

`persist` takes your creator and hands back a creator, which is what makes it middleware: `create` never learns that anything happened. `name` is the key inside the saved document. `createJSONStorage` sits between `persist` and your backend, turning the state into a JSON string on the way out and parsing it on the way in, which is why `fileStorage` only ever deals in strings.

::: warning Type error on `storage`?
If TypeScript says your object is not assignable to `PersistStorage`, you passed `fileStorage` directly instead of `storage: createJSONStorage(() => fileStorage)`. The bare `storage` option expects a backend that stores structured values; `createJSONStorage` is the adapter that lets a string-in, string-out backend satisfy it.
:::

`partialize` draws the line between what is worth keeping and what has to start fresh. Right now it names `tasks` and only `tasks`, and it will gain exactly one more field when lists arrive. The reason is not only taste: your store also holds actions, and an action is a function, which JSON has no way to represent. Saving the whole state would write `{}` where every action used to be and read it back as a store whose buttons do nothing.

Because `partialize` is annotated as returning `PersistedState`, that type is now the single description of what is on disk. Anything you add to it has to be added deliberately.

## What you did not have to write

`persist` subscribes to the store and writes on every committed `set`. Three things you would otherwise have built are now absent from the app, and it is worth naming them so you notice they are missing:

- **A save effect.** No component watches the tasks and calls a writer.
- **A debounce timer.** Ticking a checkbox writes a few kilobytes to a local file, which is fast enough that scheduling the write would cost more than doing it.
- **A flush on close.** There is no unsaved state at quit time, so the window's close handler has nothing to do.

The other half of that deal is hydration. Your backend is synchronous, so `persist` reads the file while the store is being created, before React renders anything. The first frame already shows what was on disk.

## Surviving a change to the shape

`version: 1` is a promise you make to your future self. The saved document carries that number, and when you next change the shape of a task, the file on a user's machine is still the old shape. `migrate` is where you deal with it.

Add it to `src/store/index.ts`:

```diff
+const isPersistedState = (value: unknown): value is PersistedState =>
+    typeof value === "object" && value !== null && Array.isArray(Reflect.get(value, "tasks"));
+
 export const useStore = create<Store>()(
     persist(
         (set) => ({
@@
             partialize: (state): PersistedState => ({ tasks: state.tasks }),
+            migrate: (persisted) => (isPersistedState(persisted) ? persisted : { tasks: seedTasks }),
         },
     ),
 );
```

`persist` hands `migrate` whatever it parsed, typed as `unknown`, because a file on disk is input and input is not to be trusted. The guard checks the one thing the app depends on, that `tasks` is an array, and hands the state back untouched when it holds. When it does not, the file is from a version this build cannot read or has been corrupted by hand, and you fall back to the seed rather than crashing on the first render.

::: details Why a type guard instead of a cast?
A cast would let you claim the parsed value is a `PersistedState` without checking, and the claim is false for exactly the file you wrote `migrate` to handle. The guard costs one `Array.isArray` call per launch and makes the fallback branch a real, reachable path rather than a comment about a case you hope never happens. It also means the version bump you eventually write, the one that adds a field to every stored task, has somewhere obvious to go.
:::

This is the function you edit next time the shape changes, not a stub to ignore.

## First run and seed data

That closes the loop opened in chapter four. `seedTasks` is the store's initial value, and `persist` overlays whatever it read from disk on top of it.

On a fresh install the file does not exist, `getItem` returns `null`, nothing is overlaid, and the seed is what you see. From the second launch onward the file exists and replaces `tasks` wholesale, so the seed is inert: deleting a seeded task keeps it deleted, and it will not creep back on the next start.

## Run it

Start the app, add a task, and quit:

```bash
npm run dev
```

Start it again. Your task is still in the list, in the position you left it, with its checkbox and star exactly as you set them. Tick one, quit, and start again: the tick survived too.

The file is right where you told it to be:

```bash
ls ~/.local/share/com.gtkx.tutorial/
```

```
tasks.json
```

It is a single line of JSON, so read the task you just added with `jq`:

```bash
jq '.state.tasks[-1]' ~/.local/share/com.gtkx.tutorial/tasks.json
```

```json
{
  "id": "9f1c6ad2-1f8c-4d1e-9a3f-6c0f2e5b7a41",
  "listId": "personal",
  "title": "Buy oat milk",
  "notes": "",
  "done": false,
  "important": false,
  "deleted": false,
  "due": null,
  "position": 6,
  "createdAt": "2026-07-19T09:31:47.902Z",
  "completedAt": null
}
```

The document around it is `{"state":{"tasks":[...]},"version":1}`. `state` is what `partialize` returned and `version` is the number `migrate` will be shown next time you change it. Confirm the version with `jq .version` on the same file and you get `1`.

Where that file lands depends on how the app was started:

| How you run it | Path |
| --- | --- |
| `npm run dev` or an installed build | `~/.local/share/com.gtkx.tutorial/tasks.json` |
| With `XDG_DATA_HOME` set | `$XDG_DATA_HOME/com.gtkx.tutorial/tasks.json` |
| Inside a Flatpak | `~/.var/app/com.gtkx.tutorial/data/com.gtkx.tutorial/tasks.json` |

The last row is the same rule as the second: Flatpak points `XDG_DATA_HOME` at the app's private data directory, and your code appends the application ID to it the way it always does.

## Summary

- **User content goes in a file under the XDG data directory, preferences go in GSettings.** Tasks are content, so they get `tasks.json` namespaced by the application ID.
- **A storage backend is three functions over strings.** `getItem` treats a missing file as empty, and `setItem` writes to a temporary sibling and renames it so a crash cannot leave half a file.
- **`persist` writes on every committed `set`.** There is no save effect, no debounce, and no flush at quit, and a synchronous backend means the first render already has your data.
- **`partialize` decides what reaches disk.** It names `tasks`, and actions are functions that JSON could not carry anyway.
- **`version` and `migrate` are how the shape changes safely.** A type guard validates the parsed file and falls back to the seed rather than trusting it.

## Next

[Lists and a Sidebar](/tutorial/lists-and-the-sidebar)
