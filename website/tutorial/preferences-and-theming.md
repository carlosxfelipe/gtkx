---
description: "An AdwPreferencesDialog bound two-way to GSettings keys, plus Adwaita color schemes applied through Adw.StyleManager."
---

# Preferences and Theming

Tasks ships a standard GNOME Preferences dialog: a `<Control>comma` shortcut opens an `AdwPreferencesDialog` where you pick a theme, choose the default sort order, and set the reminder lead time. The through-line is two-way data binding: each row reads and writes a GSettings key, and the app reacts to those keys, including the Adwaita color scheme.

## The preferences dialog is an Adw.Dialog, not a window

The whole surface is one component. It mounts when `app.tsx` flips `showPreferences` to `true` and renders `<Preferences onClose={...} />`:

```tsx
import { DropDown } from "@gtkx/components";
import { Dialog } from "@gtkx/components/adw";
import { AdwComboRow, AdwPreferencesDialog, AdwPreferencesGroup, AdwPreferencesPage, AdwSpinRow } from "@gtkx/jsx/adw";
import { GtkAdjustment } from "@gtkx/jsx/gtk";
import { useSetting } from "@gtkx/react";
import schema from "#data/com.gtkx.tutorial.gschema.xml";

export const Preferences = ({ onClose }: { onClose: () => void }) => {
    // ...
    return (
        <Dialog component={AdwPreferencesDialog} onClose={onClose} title="Preferences">
            {/* pages */}
        </Dialog>
    );
};
```

`AdwPreferencesDialog` is an `Adw.Dialog` subclass, not an `Adw.Window`. You show an Adw.Dialog by calling `present(parent)` on it rather than by adding it to a tree. It then renders as an adaptive sheet, a centered floating dialog on desktop and a bottom sheet when the window is narrow. That imperative lifecycle is exactly what the `Dialog` wrapper from `@gtkx/components/adw` automates.

Mounting `<Dialog>` presents the `AdwPreferencesDialog` on the parent window; dismissing it forwards `closed` to `onClose`, which sets `showPreferences` back to `false` and unmounts `<Preferences>`. The wrapper's present/close lifecycle, its portal to the root, and the guard that stops a React-driven close from looping are covered in [Feedback and Dialogs](./feedback-and-dialogs#how-a-dialog-gets-on-screen).

::: info AdwDialog vs AdwWindow
Older Adwaita code used `AdwPreferencesWindow` and `AdwWindow` subclasses that you toggled with a `visible` prop or `transient-for`. The `Adw.Dialog` family (since Adwaita 1.5) superseded them: dialogs are adaptive by default.
:::

## The preferences tree

Inside the dialog the structure is the standard Adwaita preferences hierarchy: a page holds groups, and groups hold rows.

```tsx
<AdwPreferencesPage title="General" iconName="preferences-system-symbolic">
    <AdwPreferencesGroup title="Appearance">
        <DropDown component={AdwComboRow} title="Theme" /* ... */ />
    </AdwPreferencesGroup>
    <AdwPreferencesGroup title="Tasks">
        <DropDown component={AdwComboRow} title="Sort order" /* ... */ />
        <AdwSpinRow title="Reminder lead time" /* ... */ />
    </AdwPreferencesGroup>
</AdwPreferencesPage>
```

`AdwPreferencesPage.iconName` gives the page a view-switcher icon (only visible once you add a second page); the group titles ("Appearance", "Tasks") render as the bold section headers you see stacked down the dialog. Each row is a self-contained control bound to one setting.

## Two-way binding with useSetting

Every row in this dialog is controlled by a GSettings key, read and written through `useSetting`. The hook returns a `[value, setValue]` tuple, value first:

```tsx
const [scheme, setScheme] = useSetting(schema, "color-scheme");
const [sortOrder, setSortOrder] = useSetting(schema, "sort-order");
const [reminderMinutes, setReminderMinutes] = useSetting(schema, "reminder-minutes");
```

Reading is live and writing persists: `setScheme("dark")` writes through `Gio.Settings` to dconf. The hook also subscribes to the key's `changed::color-scheme` signal, so any writer (this dialog, another window, even `gsettings set` on the command line) re-renders every component that reads the key. Nothing else in the app has to be told the value changed.

The `DropDown` for the theme wires its selection straight to the setter:

```tsx
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
```

`DropDown` with `component={AdwComboRow}` (from `@gtkx/jsx/adw`) is the declarative wrapper over `AdwComboRow`, the preferences-style row with an embedded drop-down: instead of building a `Gio.ListModel` and a `Gtk.ListItemFactory` by hand, you pass `items` as `{ id, value }` nodes. The `id` is the stable key persisted to the setting; the `value` is what shows in the row (here a plain string, rendered as a label by default). `selectedId={scheme}` makes it controlled, and `onSelectionChanged` hands back the selected `id`.

That `id` arrives typed as a bare `string`, which is why the type guards exist:

```tsx
type Scheme = "default" | "light" | "dark";
const isScheme = (value: string): value is Scheme => value === "default" || value === "light" || value === "dark";
```

`setScheme` is typed to the setting's string-union type (see below), so the guard narrows the raw `string` from the combo row back into `Scheme` before the write. The `sort-order` row follows the identical pattern with `isSort` and its nicks.

The reminder row is a spin button rather than a combo:

```tsx
<AdwSpinRow
    title="Reminder lead time"
    subtitle="Minutes before a task is due"
    adjustment={
        <GtkAdjustment value={reminderMinutes} lower={0} upper={1440} stepIncrement={5} />
    }
    onNotifyValue={(value) => setReminderMinutes(value ?? 30)}
/>
```

`AdwSpinRow` needs a `Gtk.Adjustment` to define its numeric range, and GTKX lets you pass one as a JSX element into the object-valued `adjustment` prop. `lower` and `upper` bound the value (here up to a full day early), and `stepIncrement` sets the click step.

The number is reported through the property notification `onNotifyValue`, which fires whenever the row's `value` property changes. The `onChanged` signal the row inherits from `Gtk.Editable` fires on text edits and hands back only the widget, not the parsed number. Notify handlers receive `value | null`, so the `value ?? 30` guards the null case before writing back the integer setting.

## The typed gschema module

The `schema` object threaded into every `useSetting` call comes from a single import:

```tsx
import schema from "#data/com.gtkx.tutorial.gschema.xml";
```

You never hand-write a schema descriptor. `gtkx codegen`, `gtkx dev`, and `gtkx build` parse `data/com.gtkx.tutorial.gschema.xml` and generate a typed module for it, so `schema` carries the id, path, and the value type of every key. That is what makes `useSetting(schema, "color-scheme")` return a strongly typed tuple and reject an undeclared key at compile time. The XML itself, and the ways it constrains a string key (a top-level `<enum>` versus inline `<choices>`), are covered in [Data Model and Persistence](./data-and-persistence#the-other-store-gsettings-for-ui-preferences).

Codegen narrows each constrained string key to a literal string union in the generated types: `color-scheme` becomes `"default" | "light" | "dark"` and `sort-order` becomes `"manual" | "due-date" | "title" | "created"`, with the values round-tripping as raw strings (through `getString`/`setString`, not `getEnum`). That union is precisely what the `isScheme`/`isSort` guards narrow into. `reminder-minutes` types as a plain `number`, which is why its setter takes the adjustment's numeric `value`.

::: tip Recompiling the schema
GSettings needs `gschemas.compiled` before it can read a schema. Under `gtkx dev` this is automatic: the CLI stages the `.gschema.xml`, runs `glib-compile-schemas`, and recompiles on save. `gtkx build` compiles every imported schema into a `gschemas.compiled` asset next to the bundle. You run `glib-compile-schemas` by hand only when you install the `.gschema.xml` into a system schema directory yourself, as the Flatpak build in [Packaging and Shipping](/tutorial/packaging) does.
:::

## Applying the color scheme

Persisting `color-scheme` is only half the job; something has to turn the stored `"dark"` into a dark UI. Adwaita centralizes light/dark on `Adw.StyleManager`, a process-wide singleton the application owns. The `theme.ts` helper is the entire bridge:

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

`Adw.StyleManager.getDefault()` returns the default manager, and `setColorScheme` takes an `Adw.ColorScheme` enum: `FORCE_LIGHT`/`FORCE_DARK` override the system, `DEFAULT` follows it (so "Follow system" tracks the desktop's dark-style preference).

This is imperative GObject code, imported from `@gtkx/gi/adw` (the raw GI classes and enums) rather than the JSX components. Codegen does emit an `AdwStyleManager` intrinsic element, but rendering it would construct a new manager. The color scheme has to be set on the process-wide default that already exists, so you reach for the live object `getDefault()` returns.

The reactive glue lives in `app.tsx`, which reads the same setting and re-applies the scheme whenever it changes:

```tsx
const [colorScheme] = useSetting(schema, "color-scheme");

useEffect(() => {
    applyColorScheme(colorScheme);
}, [colorScheme]);
```

Because `useSetting` re-renders on the `changed::color-scheme` signal, choosing a theme in the preferences dialog updates `colorScheme` here. The effect re-runs and Adwaita swaps the palette instantly, with no manual event plumbing between the dialog and the app root.

For the app's own generated styles, see [Colored list dots](/tutorial/the-sidebar#colored-list-dots) and the [CSS and Animations](/guide/css-and-animations) guide.

## Next

Continue to [Reminders and Notifications](/tutorial/notifications) to see how the persisted `reminder-minutes` setting drives desktop notifications through `Gio.Notification`.
