---
description: "Test the Tasks app with @gtkx/testing: render it, query the accessibility tree, and drive it with user events."
---

# Testing the App

The app's tests live in `tests/app.test.tsx` and run with `npm test`, using [`@gtkx/testing`](/guide/testing) over the live widget tree.

`tests/setup.ts` points `XDG_DATA_HOME` at a temporary directory before `store.ts` loads, clearing it in `beforeEach` so every test starts from the seeded state. `vitest.config.ts` names it in `setupFiles`:

```ts
// ...
const dataHome = mkdtempSync(join(tmpdir(), "gtkx-tutorial-"));

process.env.XDG_DATA_HOME = dataHome;

beforeEach(() => {
    rmSync(join(dataHome, "com.gtkx.tutorial"), { recursive: true, force: true });
});
// ...
```

## Rendering and querying

`App` is an `AdwApplication`, so render it into the top-level `rootElement`.

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

## Driving flows

### Opening the detail view

Firing a row's `activated` signal opens the detail pane, which renders a "Notes" heading:

```tsx
import { fireEvent } from "@gtkx/testing";

it("opens the detail view when a task is activated", async () => {
    await render(<App />, { container: rootElement });

    const row = await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: /Water the plants/ });
    await fireEvent(row, "activated");

    expect(await screen.findByText("Notes")).toHaveTextContent("Notes");
});
```

### Adding a task

```tsx
it("adds a task from the entry row", async () => {
    await render(<App />, { container: rootElement });

    const entry = await screen.findByRole(Gtk.AccessibleRole.TEXT_BOX);
    await userEvent.type(entry, "Book flights");
    await userEvent.keyboard(entry, "{Enter}");

    expect(await screen.findByRole(Gtk.AccessibleRole.LIST_ITEM, { name: "Book flights" })).toBeDefined();
});
```

### Reordering by dragging

`userEvent.dragAndDrop` synthesizes the drag-to-reorder gesture from the [Task Rows](/tutorial/task-rows-and-reordering) chapter:

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

The last query needs its `name` filter because the sidebar rows and the add-task row also report the `LIST_ITEM` role.

## Next

Continue to [Packaging and Shipping](/tutorial/packaging).
