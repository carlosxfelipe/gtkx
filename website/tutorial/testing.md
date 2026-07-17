---
description: "Test GTK4 widgets with @gtkx/testing: Testing Library style queries, user events, Vitest wiring, and MCP inspection of a live app."
---

# Testing the App

GTKX apps are built from GNOME's own widgets. You test one much the way you test a React web app: render it, query the accessibility tree, drive it with user events, and assert on the result. The [`@gtkx/testing`](https://github.com/gtkx-org/gtkx/tree/main/packages/testing) package provides a React Testing Library style API over the live widget tree. `@gtkx/vitest` wires it into Vitest; see the [testing guide's Setup section](/guide/testing#setup) for the scaffolded config and the headless environment it provides.

The tests on this page are the ones the app ships, in `examples/tutorial/tests/app.test.tsx`. They run with `npm test`, and each `it` below sits inside a `describe("Tasks")` block in that file.

One piece of wiring is specific to this app. `store.ts` reads `XDG_DATA_HOME` at module load to pick its data directory, so a test has to redirect it before that module is imported. `tests/setup.ts` does that, and `vitest.config.ts` names it in `setupFiles`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach } from "vitest";

const dataHome = mkdtempSync(join(tmpdir(), "gtkx-tutorial-"));

process.env.XDG_DATA_HOME = dataHome;

beforeEach(() => {
    rmSync(join(dataHome, "com.gtkx.tutorial"), { recursive: true, force: true });
});

afterAll(() => {
    rmSync(dataHome, { recursive: true, force: true });
});
```

Without it the tests would read and overwrite the tasks in your own `~/.local/share`. Clearing the directory in `beforeEach` rather than `afterEach` means every test starts from the seeded state.

## Rendering and querying

`render` mounts a tree and gives you a `screen` you query by role, name, or text. Because `App` is itself an `AdwApplication` (not a plain widget), render it into the top-level `rootElement`. Passing no container instead mounts into a throwaway `Gtk.Window`, which cannot host an application.

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { rootElement } from "@gtkx/react";
import { render, screen, userEvent } from "@gtkx/testing";
import { describe, expect, it } from "vitest";
import { App } from "../src/app.js";

it("marks a task complete", async () => {
    await render(<App />, { container: rootElement });

    const [checkbox] = await screen.findAllByRole(Gtk.AccessibleRole.CHECKBOX);
    await userEvent.click(checkbox);

    expect(checkbox).toBeChecked();
});
```

Every task row exposes a `GtkCheckButton` with `accessibleLabel="Mark complete"` (from the [Task Rows](/tutorial/task-rows-and-reordering) chapter), and a check button reports the `CHECKBOX` role, so `findAllByRole(Gtk.AccessibleRole.CHECKBOX)` returns one per task. `userEvent.click` runs the same `onToggled` handler the app uses in production, and `toBeChecked` asserts against the live `Gtk.CheckButton`.

`screen` exposes the full query family, which the [testing guide](/guide/testing#queries) documents in full. This chapter uses three of them: `findAllByRole` and `findByRole` to match an accessible role (always a `Gtk.AccessibleRole` value, never a string, optionally narrowed by `{ name }`), and `findByText` to match rendered label text.

## Driving a flow

Queries and events compose into full flows. Task rows are `AdwActionRow`s, which report the `LIST_ITEM` role and take their accessible name from the title, so a regular expression matches the row without the exact markup. Each row wires `onActivated`, so firing its `activated` signal opens the detail pane, which renders a "Notes" heading:

```tsx
import { fireEvent } from "@gtkx/testing";

it("opens the detail view when a task is activated", async () => {
    await render(<App />, { container: rootElement });

    const row = await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: /Water the plants/ });
    await fireEvent(row, "activated");

    expect(await screen.findByText("Notes")).toHaveTextContent("Notes");
});
```

The next flow adds a task through the inline entry row. The `AdwEntryRow` surfaces its editable with the `TEXT_BOX` role (the search entry reports the `SEARCH_BOX` role, so it never matches a `TEXT_BOX` query). `userEvent.type` inserts text, then `userEvent.keyboard` presses Enter, which activates the entry and fires the `onEntryActivated` handler:

```tsx
it("adds a task from the entry row", async () => {
    await render(<App />, { container: rootElement });

    const entry = await screen.findByRole(Gtk.AccessibleRole.TEXT_BOX);
    await userEvent.type(entry, "Book flights");
    await userEvent.keyboard(entry, "{Enter}");

    expect(await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: "Book flights" })).toBeDefined();
});
```

The new row is matched by role and name rather than by text: an `AdwActionRow` takes its accessible name from its title, so an exact `name` pins the assertion to the row the entry just created.

## Drag and drop

`@gtkx/testing` can synthesize the drag-to-reorder gesture from the [Task Rows](/tutorial/task-rows-and-reordering) chapter. Every row carries a `GtkDragSource` and `GtkDropTarget` whenever manual sort order is active (the default) and neither a search nor the Trash view is showing. `userEvent.dragAndDrop` verifies the source's drag source, then delivers the payload to the target's drop target as a marshaled `GObject.Value`. A string argument is wrapped in a `TYPE_STRING` value, which is exactly what the row's `onDrop` reads back with `value.getString()`:

```tsx
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

The third argument is the dragged task's id, the same value the row's `GtkDragSource` provides in production. Dropping "Water the plants" onto "Review pull requests" splices it in after that row and reindexes, so the two swap places, which is what the final pair of assertions pins down. The `name` filter on the last query matters: the sidebar rows and the add-task entry row also report the `LIST_ITEM` role, so an unfiltered query would mix them in with the task rows.

## Inspecting a running app

For interactive debugging rather than automated assertions, the [MCP server](/guide/mcp) exposes the same tree dumps, queries, events, and screenshots to any MCP client against your live `gtkx dev` session. The app half is automatic: `gtkx dev` registers the running app for you. The agent half is a one-time client registration, which the guide covers.

## Next

The app is complete and you have seen how to test it. Continue to [Packaging and Shipping](/tutorial/packaging) to build, package, and distribute it.
