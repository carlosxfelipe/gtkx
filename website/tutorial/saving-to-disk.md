---
description: "Persist the store to the XDG data directory so tasks survive a restart."
---

# Saving Tasks Between Runs

[The last chapter](/tutorial/completing-and-deleting) wired each row to store actions. Everything those actions change lives in memory, so it all vanishes when you quit. You fix that here without writing a single save call.

## Where user data goes

GNOME applications keep user content, the stuff a person would be upset to lose, in a file under the XDG data directory. Preferences, the knobs that describe how the app is set up, go in GSettings instead and arrive in [Preferences and the System Theme](/tutorial/preferences-and-theming).

They differ because they fail differently. Losing a preference is an annoyance; losing a task is a bug report. Tasks get a file you own, written atomically, in a location the desktop already agrees on.

## A storage backend

zustand's `persist` middleware needs somewhere to put bytes. It does not care where, so you give it an object with `getItem`, `setItem`, and `removeItem`.

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

Node standard library only. A GTKX app is a Node.js process that happens to drive GTK4, so reach for Node wherever it covers the job and save GLib and Gio for what is unique to the platform: settings, notifications, D-Bus, and the widget toolkit itself.

**The path.** `$XDG_DATA_HOME` names the per-user data directory, falling back to `~/.local/share` when unset, namespaced with the application ID you chose when scaffolding. Everything downstream follows for free.

**`getItem` swallows the read error.** On a first launch there is no file, and "no file" is not a failure. `null` is what `persist` expects when nothing is saved yet.

**`setItem` writes to a sibling and renames.** An interrupted `writeFileSync` on the real path leaves a truncated JSON file that will never parse again. `renameSync` within one directory is atomic on Linux, so `tasks.json` is either the whole previous version or the whole new one.

## Turning it on

Wrap the store creator from [Adding Tasks with a Store](/tutorial/the-task-store) in `persist`. Nothing inside it changes.

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

`persist` takes a creator and hands back a creator, which is what makes it middleware: `create` never learns that anything happened. `name` is the key inside the saved document. `createJSONStorage` sits between `persist` and your backend, stringifying state on the way out and parsing on the way in, which is why `fileStorage` only ever deals in strings.

::: warning Type error on `storage`?
If TypeScript says your object is not assignable to `PersistStorage`, you passed `fileStorage` directly instead of `storage: createJSONStorage(() => fileStorage)`. The bare `storage` option expects a backend that stores structured values; `createJSONStorage` is the adapter that lets a string-in, string-out backend satisfy it.
:::

::: warning The list snapped back to the seed when you saved
Editing `src/store/index.ts` reloads that module, and reloading it builds a new store. Tasks you added earlier in this session were only ever in memory, so they are gone, and `persist` rehydrates from a file that does not exist yet. From here on the file does exist, so the same edit brings the tasks back with it.
:::

`partialize` draws the line between what is kept and what starts fresh. It names `tasks` and nothing else, and the reason is not only taste: your store also holds actions, and an action is a function, which JSON cannot represent. Saving the whole state would write `{}` where every action used to be and read it back as a store whose buttons do nothing.

Annotating `partialize` as returning `PersistedState` makes that type the single description of what is on disk, so anything you add to it is added deliberately.

## What you did not have to write

`persist` subscribes to the store and writes on every committed `set`. So there is no save effect watching the tasks, no debounce timer (ticking a checkbox writes a few kilobytes to a local file, faster than scheduling the write would be), and nothing for the window's close handler to flush.

Hydration is the other half of the deal. Your backend is synchronous, so `persist` reads the file while the store is being created, before React renders anything. The first frame already shows what was on disk.

## Surviving a change to the shape

`version: 1` is a promise to your future self. The saved document carries that number, and when you next change the shape of a task, the file on a user's machine is still the old shape. `migrate` is where you deal with it.

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

`persist` hands `migrate` whatever it parsed, typed as `unknown`, because a file on disk is input and input is not to be trusted. The guard checks what the app depends on, that `tasks` is an array, and hands the state back untouched when that holds. When it does not, the file is from a version this build cannot read or has been corrupted by hand, and you fall back to the seed rather than crashing on the first render.

::: details Why a type guard instead of a cast?
A cast would let you claim the parsed value is a `PersistedState` without checking, and the claim is false for exactly the file `migrate` exists to handle. The guard costs a couple of checks per launch and makes the fallback a real, reachable path rather than a comment about a case you hope never happens. It also gives the version bump you eventually write, the one that adds a field to every stored task, somewhere obvious to go.
:::

Edit this function next time the shape changes; it is not a stub to ignore.

::: warning `task.due.toLocaleDateString is not a function` after a relaunch
Only on a relaunch, never in the session that created the task, and only for a date field. `JSON.stringify` turns a `Date` into a string and `JSON.parse` leaves it a string, so a task built in memory carries a real `Date` while the same task read from disk carries text that looks like one. This is why `Task` types `due`, `createdAt`, and `completedAt` as `string | null` and `string`: store the ISO text, and call `new Date(iso)` at the point of formatting, the way `src/format.ts` does.
:::

## First run and seed data

`seedTasks` is the store's initial value, and `persist` overlays whatever it read from disk on top of it.

On a fresh install the file does not exist, `getItem` returns `null`, nothing is overlaid, and the seed is what you see. From the second launch onward the file exists and replaces `tasks` wholesale, so the seed is inert: deleting a seeded task keeps it deleted, and it will not creep back on the next start.

## Run it

Save `src/store/index.ts` and the open window picks up the persisted store. Add a task, then close the window. The dev server supervises the app process, so closing it ends `npm run dev` too, and that full exit is the point: a store that only looked persistent would lose the task here.

Start it again:

```bash
npm run dev
```

Your task is still in the list, in the position you left it, with its checkbox and star exactly as you set them. Tick one, quit, and start again: the tick survived too.

The file is where you told it to be:

```bash
ls ~/.local/share/com.gtkx.tutorial/
```

```
tasks.json
```

It is a single line of JSON, so read the task you just added with `jq`.

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

## Next

[Lists and a Sidebar](/tutorial/lists-and-the-sidebar) splits the store into slices and gives tasks a list to belong to, reachable from a sidebar.
