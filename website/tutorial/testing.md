---
description: "Drive the finished app in headless tests that query the accessibility tree the way a user reaches it."
---

# Appendix A: Testing the App

The app is finished. [Chapter fifteen](/tutorial/reminders) delivered the last capability, and if you are shipping a task manager for yourself you can stop there and never open this page. This appendix is about keeping the app working: driving the real widgets, with no display attached, through the same accessibility tree a screen reader walks.

That last part is why a testing appendix is worth reading rather than skimming. GTKX queries widgets by their GTK4 accessible role and name, so a widget your test cannot reach is usually a widget an assistive technology cannot reach either. A failing query is a finding about the interface, not a testing inconvenience.

## Wiring the runner

Tests run under Vitest with the GTKX plugin, which boots a private headless environment for each worker process before any test code loads: an isolated runtime directory, a session bus, and a headless compositor. Your widgets are real GTK4 widgets, laid out and rendered off-screen.

The scaffold already put the plugin in place. Add a setup file to it.

In `vitest.config.ts`:

```diff
     test: {
         include: ["tests/**/*.test.{ts,tsx}"],
+        setupFiles: ["./tests/setup.ts"],
         bail: 1,
     },
```

The setup file exists because the app writes to disk. Chapter six pointed `storage.ts` at `XDG_DATA_HOME`, and that decision pays off here: the tests redirect one environment variable and the whole persistence layer follows them into a temporary directory.

Create `tests/setup.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach } from "vitest";

const dataHome = mkdtempSync(join(tmpdir(), "gtkx-tutorial-"));

process.env.XDG_DATA_HOME = dataHome;

const { useStore } = await import("../src/store/index.js");
const { seedLists, seedTasks } = await import("../src/store/seed.js");

beforeEach(() => {
    rmSync(join(dataHome, "com.gtkx.tutorial"), { recursive: true, force: true });
    useStore.setState({
        tasks: seedTasks,
        lists: seedLists,
        selection: { kind: "smart", view: "all" },
        selectedTaskId: null,
        collapsed: false,
        showContent: false,
        filter: "all",
        searchMode: false,
        searchQuery: "",
        dialog: "none",
        taskToDelete: null,
    });
});

afterAll(() => {
    rmSync(dataHome, { recursive: true, force: true });
});
```

The dynamic `await import` is deliberate, and it is the one line here that will bite you if you tidy it. ESM hoists static imports above every statement in the module, so a plain `import { useStore } from "../src/store/index.js"` would evaluate `storage.ts` (and read `process.env.XDG_DATA_HOME`) before the assignment above it ever ran. Importing after the assignment is what makes the redirect take effect.

::: warning Tests that pass one at a time and fail as a suite
State leaked between them. `beforeEach` deletes the persisted file and puts the store back to the seed, so every test starts from the same tasks in the same order. Without it, the second test inherits whatever the first one typed and the third inherits both.
:::

## Testing the store on its own

Start with the tests that need no widgets at all. The store is a plain module: call an action, read `getState()`, assert. These run in milliseconds and they cover the logic most likely to be wrong.

Create `tests/tasks.test.tsx`:

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { rootElement } from "@gtkx/react";
import { fireEvent, render, screen, userEvent } from "@gtkx/testing";
import { describe, expect, it } from "vitest";
import { App } from "../src/app.js";
import { useStore } from "../src/store/index.js";

describe("the store", () => {
    it("adds a task and completes it", () => {
        const id = useStore.getState().addTask("personal", "  Call the plumber  ");

        expect(id).not.toBeNull();

        const added = useStore.getState().tasks.find((task) => task.id === id);

        expect(added?.title).toBe("Call the plumber");
        expect(added?.done).toBe(false);

        if (id) useStore.getState().setDone(id, true);

        const completed = useStore.getState().tasks.find((task) => task.id === id);

        expect(completed?.done).toBe(true);
        expect(completed?.completedAt).not.toBeNull();
    });
});
```

This is the last dividend from putting state outside the component tree in chapter four. `addTask` trims its input and hands back the new identifier, `setDone` stamps `completedAt`, and proving both takes no window, no render, and no query. Reach for a rendered test when the subject is the interface; reach for this when the subject is a rule.

## Rendering the app

Everything below drives the whole application. Append a second `describe` to the same file.

In `tests/tasks.test.tsx`:

```tsx
// ...

describe("Tasks", () => {
    it("adds a task from the entry row", async () => {
        await render(<App />, { container: rootElement });

        const entry = await screen.findByRole(Gtk.AccessibleRole.TEXT_BOX);
        await userEvent.type(entry, "Book flights");
        await userEvent.keyboard(entry, "{Enter}");

        expect(await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: "Book flights" })).toBeDefined();
    });
});
```

`render` is awaited because mounting widgets means flushing React's work through a live GTK4 loop. The `container: rootElement` option is what makes an application testable: `App` returns an `AdwApplication`, which is not a widget and cannot be parented inside a harness window, so it mounts into the top-level root the same way `createRoot()` mounts it in `index.tsx`.

Then the queries. `Gtk.AccessibleRole.TEXT_BOX` reaches the add row, `LIST_ITEM` reaches an `AdwActionRow`, and `CHECKBOX` reaches a `GtkCheckButton`. These are GTK4's own roles, read live off each widget, which is why the vocabulary is an enum and never a string.

Two helper signatures differ from the browser testing libraries you may have muscle memory for. The keyboard helper takes its target widget first, because there is no document-wide focus to fall back on. And the drag helper takes a payload as its third argument, which you meet in a moment.

## Ticking, opening, dragging

Three more tests, each exercising a chapter you already built. Add them inside the same `describe`.

In `tests/tasks.test.tsx`:

```tsx
// ...

    it("marks a task complete", async () => {
        await render(<App />, { container: rootElement });

        const [checkbox] = await screen.findAllByRole(Gtk.AccessibleRole.CHECKBOX);
        await userEvent.click(checkbox);

        expect(checkbox).toBeChecked();
    });
```

`toBeChecked` is one of the widget matchers that importing `@gtkx/testing` adds to `expect`. It reads the accessible checked state off the `GtkCheckButton`, and it throws when the widget does not expose that state at all, so aiming it at the wrong widget fails loudly instead of passing quietly.

In `tests/tasks.test.tsx`:

```tsx
// ...

    it("opens the editor when a row is activated", async () => {
        await render(<App />, { container: rootElement });

        const row = await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: /Water the plants/ });
        await fireEvent(row, "activated");

        expect(await screen.findByText("Notes")).toHaveTextContent("Notes");
    });
```

Here the test emits a signal directly instead of synthesizing input. `userEvent` stays the better default because it drives the same event plumbing as production, but `activated` on a row is a signal with no single gesture behind it, and `fireEvent(object, signalName)` emits any GObject signal without actionability checks. The name matcher is a regular expression because that row's accessible name carries its due-date subtitle along with the title.

In `tests/tasks.test.tsx`:

```tsx
// ...

    it("reorders tasks by dragging", async () => {
        await render(<App />, { container: rootElement });

        const source = await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: /Water the plants/ });
        const target = await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: /Review pull requests/ });
        await userEvent.dragAndDrop(source, target, "t2");

        const [first, second] = await screen.findAllByRole(Gtk.AccessibleRole.LIST_ITEM, {
            name: /Water the plants|Review pull requests/,
        });

        expect(first).toHaveAccessibleName("Review pull requests");
        expect(second).toHaveAccessibleName("Water the plants");
    });
```

The third argument to `dragAndDrop` is the payload, and it has to be the string your `GtkDragSource` puts in its content provider: the task identifier from chapter fourteen. The assertion reads the two rows back in tree order and checks that they swapped. Because the seed gives every task a distinct position across the whole set, that order is the same on every run.

## Reading a failure

When a query finds nothing, the error tells you what the tree actually holds. Ask for a button the app does not have:

```tsx
screen.getByRole(Gtk.AccessibleRole.BUTTON, { name: "Add task" });
```

and the failure prints the accessible tree grouped by role:

```
GtkxElementError: Unable to find an element with role 'BUTTON' and name 'Add task'

Here are the accessible roles:

button:
  Name "": <Button role="button"></Button>
  Name "New List": <Button role="button">New List</Button>
  Name "": <Button role="button"></Button>
  Name "Apply": <Button role="button">Apply</Button>
  Name "Delete task": <Button role="button">Delete task</Button>
  Name "Delete task": <Button role="button">Delete task</Button>
  Name "": <Button role="button"></Button>
  Name "New Task (Ctrl+N)": <Button role="button">New Task (Ctrl+N)</Button>
  Name "Search (Ctrl+F)": <Button role="button">Search (Ctrl+F)</Button>
  Name "Main Menu": <MenuButton role="button">Main Menu</MenuButton>
```

The dump carries on through every other role in the window. Read it as an accessibility report rather than as a stack trace. `Name "Delete task"` appears once per visible row because chapter five gave that icon-only button an `accessibleLabel`, and every entry reading `Name ""` is a widget that neither a query nor a screen reader can name.

You do not have to fail a query to see this. `screen.debug()` prints the annotated tree at any point in a test, and `screen.logRoles()` prints the same grouping on demand, which is the fastest way to answer "what role does this widget report?" before you write the query.

::: details What if my query works but a better one exists?
Queries can also fail on purpose when you reach for a widget the weak way. Turn on `configure({ throwSuggestions: true })`, or pass `suggest: true` to a single query, and any query that could have gone through a stronger kind throws instead:

```
A better query is available, try this:
getByRole(BUTTON, { name: /main menu/i })
```

It is off by default. Switch it on when you want the suite to push you toward role-and-name queries everywhere, which is the same push toward labelling every widget.
:::

The rest of the harness, including `within`, `renderHook`, `waitFor`, screenshots, and the full matcher set, is in the [testing guide](/guide/testing).

## The finished file

`tests/tasks.test.tsx` in full:

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { rootElement } from "@gtkx/react";
import { fireEvent, render, screen, userEvent } from "@gtkx/testing";
import { describe, expect, it } from "vitest";
import { App } from "../src/app.js";
import { useStore } from "../src/store/index.js";

describe("the store", () => {
    it("adds a task and completes it", () => {
        const id = useStore.getState().addTask("personal", "  Call the plumber  ");

        expect(id).not.toBeNull();

        const added = useStore.getState().tasks.find((task) => task.id === id);

        expect(added?.title).toBe("Call the plumber");
        expect(added?.done).toBe(false);

        if (id) useStore.getState().setDone(id, true);

        const completed = useStore.getState().tasks.find((task) => task.id === id);

        expect(completed?.done).toBe(true);
        expect(completed?.completedAt).not.toBeNull();
    });
});

describe("Tasks", () => {
    it("adds a task from the entry row", async () => {
        await render(<App />, { container: rootElement });

        const entry = await screen.findByRole(Gtk.AccessibleRole.TEXT_BOX);
        await userEvent.type(entry, "Book flights");
        await userEvent.keyboard(entry, "{Enter}");

        expect(await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: "Book flights" })).toBeDefined();
    });

    it("marks a task complete", async () => {
        await render(<App />, { container: rootElement });

        const [checkbox] = await screen.findAllByRole(Gtk.AccessibleRole.CHECKBOX);
        await userEvent.click(checkbox);

        expect(checkbox).toBeChecked();
    });

    it("opens the editor when a row is activated", async () => {
        await render(<App />, { container: rootElement });

        const row = await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: /Water the plants/ });
        await fireEvent(row, "activated");

        expect(await screen.findByText("Notes")).toHaveTextContent("Notes");
    });

    it("reorders tasks by dragging", async () => {
        await render(<App />, { container: rootElement });

        const source = await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: /Water the plants/ });
        const target = await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: /Review pull requests/ });
        await userEvent.dragAndDrop(source, target, "t2");

        const [first, second] = await screen.findAllByRole(Gtk.AccessibleRole.LIST_ITEM, {
            name: /Water the plants|Review pull requests/,
        });

        expect(first).toHaveAccessibleName("Review pull requests");
        expect(second).toHaveAccessibleName("Water the plants");
    });
});
```

## Run it

```
npm test
```

Every test passes against real GTK4 widgets with no display attached:

```
 RUN  v4.1.10 /home/eugenio/gtkx/examples/tutorial

[gtkx] Compiled GSettings schema: com.gtkx.tutorial.gschema.xml

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  18:12:36
   Duration  8.71s (transform 6.38s, setup 358ms, import 7.60s, tests 518ms, environment 0ms)
```

Now break something on purpose. Change the drag payload in the reorder test from `"t2"` to `"t9"` and run again: the test fails, because the drop target looks that identifier up in the store and finds no task, which is exactly what a mismatched content provider would do in the running app. Put it back and the suite goes green again.

You have a suite that renders the whole application headlessly, drives it by role and name, and covers store logic apart from the interface. The queries double as an accessibility audit, and persistence isolates itself because it reads one environment variable.

## Next

[Appendix B: Making It a Real Application](/tutorial/packaging) turns the project into something the desktop recognizes: an icon, a desktop entry, and a name in the application menu.
