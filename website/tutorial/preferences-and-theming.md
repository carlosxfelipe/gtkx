---
description: "Store preferences in GSettings, add a preferences dialog, sort the list, and follow the system theme."
---

# Preferences and the System Theme

Deleting is recoverable now, with a toast for the reversible case and a dialog for the permanent one, and the sidebar can grow a new list ([Deleting Without Fear](/tutorial/trash-and-toasts)). This chapter cashes in the promise made back in [Saving Tasks Between Runs](/tutorial/saving-to-disk): user content lives in a JSON file, and preferences live somewhere else. You will build that somewhere else, put a preferences dialog in front of it, sort the task list by it, and let the window follow the desktop's light or dark theme.

## Preferences are not user data

Your tasks are open-ended: there could be three or three thousand, each an object whose shape only your app understands. A JSON file suits that perfectly.

A preference is the opposite. The theme is one of a closed set of names. The reminder lead time is a whole number of minutes with a floor and a ceiling. The window width is a pixel count. Every one of them has a type, a default, and a range of legal values, and the desktop itself has a stake in them: `gsettings` can read and write them from a terminal, `dconf-editor` can browse them, and resetting an application to factory settings means clearing them.

GSettings gives you exactly that: a declared schema with types, defaults, and constraints, a per-user database behind it, and change notification when a value moves. A JSON blob gives you none of it. So preferences go in GSettings, and that split holds for the rest of the tutorial.

## Declaring the schema

GSettings will not let you read or write a key you have not declared. The declaration is an XML schema file, and it lives in your project's `data/` directory.

Create `data/com.gtkx.tutorial.gschema.xml`:

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

The schema `id` is your application ID, and the `path` is that ID with slashes instead of dots. That is the convention GNOME expects, and it is why a reverse-DNS application ID had to be settled in the first chapter.

Two forms of constraint appear here. `color-scheme` is a plain string key with an inline `<choices>` list, which is right when the legal values are just strings. `sort-order` refers to a top-level `<enum>` by id, which pairs each name with a stored integer, so the value on disk is compact and the name you write in code stays readable. An enum key's `<default>` is the nick in single quotes, not the number. `reminder-minutes` takes a `<range>` instead, capping the lead time at a day.

Constraints are worth the extra lines because GSettings enforces them at the point of writing: a write outside the declared choices or range is rejected. A value you read back from a settings key is therefore already legal, and you never have to validate it on the way in.

The two window keys are not something the user ever picks. They are the app remembering itself, which is the same kind of small typed value, so they belong here too.

## Importing the schema

`gtkx dev`, `gtkx build`, and `gtkx codegen` scan `data/` for `.gschema.xml` files, compile them with `glib-compile-schemas`, and generate a module per schema carrying its keys and their types. You reach that module through a subpath import, so add one to `package.json`:

```diff
 {
     "name": "gtkx-tutorial",
     "version": "0.1.0",
     "private": true,
     "type": "module",
+    "imports": {
+        "#data/*": "./data/*"
+    },
```

Now any file can pull the schema in by its path:

```ts
import schema from "#data/com.gtkx.tutorial.gschema.xml";
```

That import is not the XML text. It is the generated module, and it carries the key types with it, so `"sort-order"` resolves to the union `"manual" | "due-date" | "title" | "created"` and `"window-width"` resolves to `number`. Misspell a key name and the type checker catches it before the app runs.

::: warning Settings schema is not installed?
If the app dies at startup with `GLib-GIO-ERROR **: Settings schema 'com.gtkx.tutorial' is not installed`, the compiled schema is not on the search path. Two usual causes: the file is not under `data/`, which is the only directory scanned, or you are running `node dist/bundle.js` directly instead of through `npm run dev`. Restart `npm run dev` after creating the file, since schemas are compiled during dev startup rather than watched into existence mid-session.
:::

## Binding first

Start with the window size, because it needs no dialog and no code of your own.

`useBindSetting` ties a GSettings key to a GObject property on a live widget, in both directions and for as long as the widget exists. Give it the schema, the key, a ref to the widget, and the property name in camelCase.

In `src/components/window.tsx`:

```tsx
import * as Adw from "@gtkx/gi/adw";
// ...
import { quit, useBindSetting, useSetting } from "@gtkx/react";
import { useEffect, useRef } from "react";
import schema from "#data/com.gtkx.tutorial.gschema.xml";
// ...

export const Window = () => {
    // ...
    const windowRef = useRef<Adw.ApplicationWindow | null>(null);

    useBindSetting(schema, "window-width", windowRef, "defaultWidth");
    useBindSetting(schema, "window-height", windowRef, "defaultHeight");

    return (
        <AdwApplicationWindow
            ref={windowRef}
            title="Tasks"
            // ...
        >
```

That is the whole feature. The window applies the stored width and height when it is created, and writes the new numbers back when the user resizes it. There is no save handler, no close handler, and no restore effect anywhere in your app, because the binding is the mechanism rather than a trigger for one.

`useBindSetting` has no return value on purpose. There is nothing to render: the property on the widget is the value, and React never needs to know it changed.

## Reading and writing a value

Not every preference has a widget property waiting for it. The theme is applied by a process-wide manager, and the sort order is consumed by a plain function. For those, `useSetting` gives you the value and a setter, in the shape a React developer already knows:

```tsx
const [sortOrder, setSortOrder] = useSetting(schema, "sort-order");
```

It reads the current value, re-renders the component whenever that key changes (including when something outside your app changes it), and writes through to the database when you call the setter. Every component reading the same key sees the same value, with no store, no context, and no prop in between. GSettings is already the shared source of truth.

## Sorting

The list has an order today, but only the one tasks happened to be created in. Now that a preference can hold a choice, make the order a choice.

Add the type to `src/types.ts`:

```diff
 export type Filter = "all" | "open" | "done";
+
+export type SortOrder = "manual" | "due-date" | "title" | "created";
```

Then a comparator in `src/store/selectors.ts`:

```ts
// ...
import type { Filter, Selection, SmartView, SortOrder, Task, TaskList } from "../types.js";

// ...

const byOrder =
    (order: SortOrder) =>
    (a: Task, b: Task): number => {
        switch (order) {
            case "due-date": {
                if (a.due === b.due) return a.position - b.position;
                if (!a.due) return 1;
                if (!b.due) return -1;
                return a.due < b.due ? -1 : 1;
            }
            case "title":
                return a.title.localeCompare(b.title);
            case "created":
                return a.createdAt.localeCompare(b.createdAt);
            default:
                return a.position - b.position;
        }
    };
```

Due date sends tasks without a due date to the end, where an undated task counts as not urgent rather than infinitely urgent, and breaks ties on the stored `position` so the order within a day stays stable. Title and creation date compare with `localeCompare`, which orders accented characters the way the user's language expects rather than by code point. Due dates and creation stamps are ISO strings, which sort correctly as plain text, which is one of the reasons the model stores them that way. `manual` falls through to `position`, which is still insertion order today; the next chapter gives the user a way to set it.

`visibleTasks` gains the option and one call:

```diff
-export type VisibleOptions = { query: string; filter: Filter };
+export type VisibleOptions = { query: string; filter: Filter; sortOrder: SortOrder };

 export const visibleTasks = (tasks: Task[], selection: Selection, options: VisibleOptions): Task[] =>
     tasks
         .filter(
             (task) =>
                 inSelection(task, selection) &&
                 matchesQuery(task, options.query) &&
                 matchesFilter(task, options.filter),
-        );
+        )
+        .sort(byOrder(options.sortOrder));
```

`sort` mutates the array it is called on, which is safe here and only here: `filter` has already produced a fresh array, so the store's own `tasks` array is untouched.

The caller supplies the setting. In `src/components/task-list.tsx`:

```diff
+import { useSetting } from "@gtkx/react";
+import schema from "#data/com.gtkx.tutorial.gschema.xml";
+
 export const TaskList = () => {
     // ...
+    const [sortOrder] = useSetting(schema, "sort-order");

-    const visible = visibleTasks(tasks, selection, { query: searchQuery, filter });
+    const visible = visibleTasks(tasks, selection, { query: searchQuery, filter, sortOrder });
```

This is the line drawn back in [Smart Views, Filters, and Search](/tutorial/smart-views-and-search), now visible from both sides. The filter is what the interface is doing right now, so it lives in the UI slice and starts fresh each launch. The sort order is a decision the user made about how they want to work, so it lives in GSettings and comes back tomorrow.

## The dialog

`win.preferences` and its <kbd>Ctrl</kbd>+<kbd>,</kbd> accelerator already exist, and `dialogs.tsx` already knows how to mount whichever dialog the store names. The dialog itself is what is missing.

Adwaita has a dedicated shape for this. `AdwPreferencesDialog` holds one or more `AdwPreferencesPage` elements, each shown with its own icon, and each page holds `AdwPreferencesGroup` elements that render as titled boxed lists. You get GNOME's preferences layout by nesting the right elements rather than by styling anything.

Create `src/components/preferences.tsx`:

```tsx
import { DropDown } from "@gtkx/components";
import { AdwComboRow, AdwPreferencesDialog, AdwPreferencesGroup, AdwPreferencesPage, AdwSpinRow } from "@gtkx/jsx/adw";
import { GtkAdjustment } from "@gtkx/jsx/gtk";
import { useSetting } from "@gtkx/react";
import schema from "#data/com.gtkx.tutorial.gschema.xml";

type Scheme = "default" | "light" | "dark";
type Sort = "manual" | "due-date" | "title" | "created";

const isScheme = (value: string): value is Scheme => value === "default" || value === "light" || value === "dark";
const isSort = (value: string): value is Sort =>
    value === "manual" || value === "due-date" || value === "title" || value === "created";

export const Preferences = ({ onClose }: { onClose: () => void }) => {
    const [scheme, setScheme] = useSetting(schema, "color-scheme");
    const [sortOrder, setSortOrder] = useSetting(schema, "sort-order");
    const [reminderMinutes, setReminderMinutes] = useSetting(schema, "reminder-minutes");

    return (
        <AdwPreferencesDialog onClosed={onClose} title="Preferences">
            <AdwPreferencesPage title="General" iconName="preferences-system-symbolic">
                <AdwPreferencesGroup title="Appearance">
                    <DropDown
                        component={AdwComboRow}
                        title="Theme"
                        items={[
                            { id: "default", value: "Follow system" },
                            { id: "light", value: "Light" },
                            { id: "dark", value: "Dark" },
                        ]}
                        selectedId={scheme}
                        onSelectionChanged={(id) => {
                            if (isScheme(id)) setScheme(id);
                        }}
                    />
                </AdwPreferencesGroup>
                <AdwPreferencesGroup title="Tasks">
                    <DropDown
                        component={AdwComboRow}
                        title="Sort order"
                        items={[
                            { id: "manual", value: "Manual" },
                            { id: "due-date", value: "Due date" },
                            { id: "title", value: "Title" },
                            { id: "created", value: "Date created" },
                        ]}
                        selectedId={sortOrder}
                        onSelectionChanged={(id) => {
                            if (isSort(id)) setSortOrder(id);
                        }}
                    />
                    <AdwSpinRow
                        title="Reminder lead time"
                        subtitle="Minutes before a task is due"
                        adjustment={<GtkAdjustment value={reminderMinutes} lower={0} upper={1440} stepIncrement={5} />}
                        onNotifyValue={(value) => setReminderMinutes(value ?? 30)}
                    />
                </AdwPreferencesGroup>
            </AdwPreferencesPage>
        </AdwPreferencesDialog>
    );
};
```

Three things in there are new.

`DropDown` from `@gtkx/components` takes a `component` prop naming what it renders into. A bare `GtkDropDown` is the plain widget; `AdwComboRow` is the same choice presented as a row inside a preferences group, which is what belongs here. The choices are a plain array of `id` and `value` pairs, `selectedId` drives the selection, and `onSelectionChanged` reports the id the user picked. It is the controlled-widget pairing from [Completing, Starring, and Deleting](/tutorial/completing-and-deleting), with a settings key on the other end instead of the store.

`AdwSpinRow` takes its bounds through a `GtkAdjustment` in the `adjustment` slot, the same JSX-valued-prop shape as `topBar` and `prefix`. The adjustment carries the value, the floor, the ceiling, and the step, which is why the row itself takes none of them. The lead time it sets has no effect yet: the sweep that reads it arrives in [Reminders That Reach the Desktop](/tutorial/reminders), and there is no need to hold that mechanism in your head to finish this chapter. Wire the row up now and the reminder chapter will find a value waiting.

The type guards are the third. `onSelectionChanged` hands back a bare `string`, because a drop-down of arbitrary items cannot know your key's type. The setter wants one of the declared names. `isScheme` and `isSort` narrow the string to that union, so the write type-checks without a cast and an id that is not a legal value is quietly ignored. That is the general shape whenever a widget's loose type meets a generated literal union.

Finally, let the dialog switch reach it. In `src/components/dialogs.tsx`:

```diff
+import { Preferences } from "./preferences.js";
+
     switch (dialog) {
         case "about":
             return <About onClose={close} />;
         case "shortcuts":
             return <Shortcuts onClose={close} />;
+        case "preferences":
+            return <Preferences onClose={close} />;
```

It follows the same contract as the other two: mounting the component presents the dialog, `onClosed` calls back so the store can clear the state that mounted it, and unmounting closes it.

## Applying the theme

The theme picker writes a string. Something has to turn that string into a repaint.

Adwaita's light and dark handling belongs to `Adw.StyleManager`, and the default manager covers the whole process. It is not a widget, it is not in your tree, and there is nothing to render, so setting the scheme is a call rather than a prop.

Create `src/theme.ts`:

```ts
import * as Adw from "@gtkx/gi/adw";

export const applyColorScheme = (value: string): void => {
    const manager = Adw.StyleManager.getDefault();
    const scheme =
        value === "light"
            ? Adw.ColorScheme.FORCE_LIGHT
            : value === "dark"
              ? Adw.ColorScheme.FORCE_DARK
              : Adw.ColorScheme.DEFAULT;
    manager.setColorScheme(scheme);
};
```

`DEFAULT` is the value that earns the "Follow system" label. It hands the decision back to the desktop, so when the user flips GNOME to dark, or their night schedule does it at sunset, your window follows along with no further work from you. `FORCE_LIGHT` and `FORCE_DARK` override that for the users who want your app to disagree with their desktop.

Call it from an effect on the setting, in `src/components/window.tsx`:

```tsx
// ...
import { applyColorScheme } from "../theme.js";

export const Window = () => {
    // ...
    const [colorScheme] = useSetting(schema, "color-scheme");

    useEffect(() => {
        applyColorScheme(colorScheme);
    }, [colorScheme]);
```

An effect is the right tool here precisely because the target is outside React. `useSetting` re-renders the window when the key changes, the effect notices the new value in its dependency list, and the call reaches out to process-wide state that no render produces.

## Run it

```bash
npm run dev
```

Press <kbd>Ctrl</kbd>+<kbd>,</kbd>. The Preferences dialog slides in over the window with a General page, an Appearance group holding Theme, and a Tasks group holding Sort order and Reminder lead time.

Set Theme to Dark. The window repaints immediately, dialog and all, while the dialog is still open. Set it back to Follow system and it matches your desktop again.

Set Sort order to Title and close the dialog. The task list is alphabetical, and it stays alphabetical as you switch between lists and smart views.

Resize the window to something distinctly wide, quit, and start it again. It comes back at the size you left it, still sorted by title, still on the theme you chose. From another terminal, compile the schema and ask GSettings directly:

```bash
glib-compile-schemas data
GSETTINGS_SCHEMA_DIR=data gsettings get com.gtkx.tutorial window-width
```

```
1240
```

The number matches the width you dragged the window to, and it is your desktop's settings database answering, not your app.

## Summary

- **Preferences and user content have different homes.** Open-ended data the user typed goes in the JSON file; a small closed set of typed values goes in GSettings, where the desktop can read, reset, and constrain it.
- **The schema is the contract.** Declared types, defaults, `<choices>`, an `<enum>`, and a `<range>` mean a write outside the legal values is rejected, so a value you read is already valid.
- **A generated module carries the key types.** Importing the schema through the `#data/*` subpath turns key names into checked strings and constrained keys into literal unions.
- **`useBindSetting` removes save and restore code entirely.** The window size is a two-way binding between a key and a widget property, with no handler of your own.
- **`useSetting` is the tuple form for everything else.** It reads live, writes through, and re-renders every component watching that key.
- **The sort order is a preference and the filter is view state.** One persists, the other starts fresh, and the same `visibleTasks` function consumes both.
- **The theme is process-wide.** `Adw.StyleManager` is not a widget, so an effect applies the setting, and `DEFAULT` hands light and dark back to the desktop.

## Next

[Dragging Tasks Into Order](/tutorial/drag-to-reorder)
