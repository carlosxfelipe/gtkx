---
description: "GActions in a React app: declare named commands once, then drive them from menus, keyboard accelerators, and desktop notifications."
---

# Actions, Menus, and Shortcuts

In a React web app, a click handler is wired straight to a button. GTK4 pulls those two apart. A **GAction** is a named, addressable command ("new", "preferences", "open-task") that lives in an *action map*, and buttons, menu items, keyboard accelerators, and even desktop notifications all reference that command by a string name. Define the behavior once, trigger it from anywhere.

Tasks uses this everywhere its commands need more than one entry point. The hamburger menu item and the `Ctrl+N` accelerator both resolve the same `win.new` action, and the "New Task" toolbar button calls the very handler that action wraps.

## Two scopes: `win.*` and `app.*`

Every action string carries a scope prefix. Tasks uses both:

- **`win.*`** actions belong to the window. They are the app's real commands (new task, preferences, about) and their accelerators only fire while that window has focus. They live in the window's `actions` slot.
- **`app.*`** actions belong to the application itself. Tasks uses them only for the two commands a desktop notification fires: its "Mark Complete" button and the default action that runs when you click the notification body. A notification is delivered to the whole application, not to any particular window, and it may arrive when no window is open. They live in the `actions` slot of `<AdwApplication>`.

The scope prefix is not cosmetic: it selects *which* action map GTK4 looks in when it resolves a `detailed-action-name` from a menu item or a notification button.

## Window actions: `<GSimpleAction>` in the `actions` slot

`GSimpleAction` is the concrete GAction you instantiate. In GTKX it is a declarative intrinsic element from `@gtkx/jsx/gio`, so you mount actions as JSX and let them come and go with your component tree. Each one takes a `name` and an `onActivate` handler that runs when the action fires.

Tasks groups the five window commands into one `WindowActions` component:

```tsx
import { GSimpleAction } from "@gtkx/jsx/gio";

const WindowActions = ({
    onNew,
    onSelect,
    onPreferences,
    onShortcuts,
    onAbout,
}: {
    onNew: () => void;
    onSelect: () => void;
    onPreferences: () => void;
    onShortcuts: () => void;
    onAbout: () => void;
}) => (
    <>
        <GSimpleAction name="new" onActivate={onNew} />
        <GSimpleAction name="select" onActivate={onSelect} />
        <GSimpleAction name="preferences" onActivate={onPreferences} />
        <GSimpleAction name="shortcuts" onActivate={onShortcuts} />
        <GSimpleAction name="about" onActivate={onAbout} />
    </>
);
```

The scope prefix comes from *where* you mount these, not from the `name`. `AdwApplicationWindow` exposes an `actions` slot backed by the window's `addAction`, so a `<GSimpleAction name="new">` placed there becomes `win.new`:

```tsx
<AdwApplicationWindow
    ref={windowRef}
    title="Tasks"
    // ...
    actions={
        <WindowActions
            onNew={newTask}
            onSelect={enterSelection}
            onPreferences={() => setShowPreferences(true)}
            onShortcuts={() => setShowShortcuts(true)}
            onAbout={() => setShowAbout(true)}
        />
    }
    // controllers: view shortcuts, below
>
```

Because the handlers close over the window component's state setters (`setShowPreferences`, `setShowAbout`, ...), firing `win.preferences` from *any* source (menu click, accelerator, a future button) flips React state. The action is the single seam between "a command was requested" and "here is what that does".

::: tip
The `onActivate` handler receives `(parameter, self)`, where `parameter` is a `GLib.Variant | null`. The five window actions here are parameterless, so they ignore it. The two application actions below use it.
:::

## Accelerators: `actionAccels` on `<AdwApplication>`

An action has no keyboard shortcut until you register an accelerator for it. That registration is application-global, so it lives on `<AdwApplication>`, not on the window. GTKX surfaces it as the declarative `actionAccels` prop: an array mapping a `detailedActionName` to a list of accelerator strings. Each entry becomes one `gtk_application_set_accels_for_action` call, binding those accelerators to the action by name, and dropping an entry from the array clears them again.

```tsx
<AdwApplication
    actionAccels={[
        { detailedActionName: "win.new", accels: ["<Control>n"] },
        { detailedActionName: "win.preferences", accels: ["<Control>comma"] },
        { detailedActionName: "win.shortcuts", accels: ["<Control>question"] },
    ]}
>
    {/* application actions + window, below */}
</AdwApplication>
```

Note that these `detailedActionName`s are `win.*`: the accelerator is registered at the application level but points at a window-scoped action, so the shortcut only fires while a window owning a `new` / `preferences` / `shortcuts` action is focused. The accelerator strings use GTK4's parser syntax: `<Control>`, `<Shift>`, `<Alt>`, plus a key name (`comma`, `question`, `n`). `<Control>question` is the conventional GNOME "keyboard shortcuts" binding.

Not every action needs an accelerator. `win.select` and `win.about` are reachable only from the menu, so they are absent from `actionAccels`.

## Application actions for notifications

The two `app.*` actions live in the `actions` slot of `<AdwApplication>`, mounted one level up from the window so a desktop notification has something to invoke even when no window is focused. Each declares a `parameterType` of `"s"` and carries a task id as its payload, and the notification targets them by their fully scoped names: its button invokes `app.complete-task`, and its default action invokes `app.open-task`.

[Reminders and Notifications](/tutorial/notifications) is the canonical home for these actions: the full `GSimpleAction` declaration, the `onActivate` handlers, the `buildReminder` notification model, and the `notify` ref that bridges each application-scoped action to the live window all live there.

## The primary menu: `<GtkMenuButton>` + declarative `<Menu>`

The hamburger button in the header bar is a `GtkMenuButton` whose popup is a `GMenu` model, not a tree of widgets. A GMenu is a pure data model of labels and action names; GTK4 renders it into the actual popover for you. GTKX's `Menu` component (from `@gtkx/components`) builds that `Gio.Menu` from a plain array, and you hand it to the button's `menuModel` slot:

```tsx
import { Menu } from "@gtkx/components";
import { GtkMenuButton } from "@gtkx/jsx/gtk";

export const MainMenu = () => (
    <GtkMenuButton
        primary
        iconName="open-menu-symbolic"
        tooltipText="Main Menu"
        menuModel={
            <Menu
                items={[
                    {
                        section: [
                            { label: "New Task", action: "win.new" },
                            { label: "Select Tasks", action: "win.select" },
                        ],
                    },
                    {
                        section: [
                            { label: "Preferences", action: "win.preferences" },
                            { label: "Keyboard Shortcuts", action: "win.shortcuts" },
                        ],
                    },
                    { section: [{ label: "About Tasks", action: "win.about" }] },
                ]}
            />
        }
    />
);
```

Each entry pairs a `label` with an `action` string, and those strings are exactly the scoped action names declared earlier. There is no `onClick` here: choosing "Preferences" activates `win.preferences`, which reaches the same `setShowPreferences(true)` as the accelerator does. The `section` wrapping groups items into visually separated blocks (GTK4 draws a divider between sections), which is how the standard GNOME primary menu is organized.

Two `GtkMenuButton` props matter for a primary menu: `iconName="open-menu-symbolic"` is the conventional hamburger icon, and `primary` marks this as *the* window menu, which lets `F10` open it. `MainMenu` is dropped into the header bar's `end` slot:

```tsx
const listHeader = (
    <AdwHeaderBar
        titleWidget={<FilterToggle filter={filter} onChange={setFilter} />}
        // start: the New Task and Search buttons
        end={<MainMenu />}
    />
);
```

## View shortcuts: `GtkShortcutController` for ephemeral keys

`Ctrl+F` and `Escape` are different in kind from `win.new`. They are not commands you would ever surface in a menu, and their meaning depends on transient view state: `Escape` cancels selection mode, and should do nothing when selection mode is off. Modeling those as GActions would be awkward. Instead Tasks attaches a `GtkShortcutController`, a `GtkEventController` that holds a list of `GtkShortcut`s, each pairing a *trigger* (a key combination) with an *action* (a callback).

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { GtkShortcut, GtkShortcutController } from "@gtkx/jsx/gtk";

const makeShortcut = (accelerator: string, run: () => void, enabled: boolean) => (
    <GtkShortcut
        trigger={enabled ? Gtk.ShortcutTrigger.parseString(accelerator) : Gtk.NeverTrigger.get()}
        action={Gtk.CallbackAction.new(() => {
            run();
            return true;
        })}
    />
);

const AppShortcuts = ({
    onSearch,
    onEscape,
    escapeEnabled,
}: {
    onSearch: () => void;
    onEscape: () => void;
    escapeEnabled: boolean;
}) => (
    <GtkShortcutController
        scope={Gtk.ShortcutScope.GLOBAL}
        shortcuts={
            <>
                {makeShortcut("<Control>f", onSearch, true)}
                {makeShortcut("Escape", onEscape, escapeEnabled)}
            </>
        }
    />
);
```

A few GTKX-specific details:

- **`trigger`** and **`action`** are object-typed props: here you pass live GI instances rather than JSX. `Gtk.ShortcutTrigger.parseString("<Control>f")` parses an accelerator string into a trigger; `Gtk.CallbackAction.new(cb)` wraps a JS callback as the shortcut action. The callback returns `true` to signal the key was handled and stop further propagation.
- **`scope={Gtk.ShortcutScope.GLOBAL}`** means the shortcut fires no matter which descendant widget has focus inside the window, which is what you want for window-wide keys like search.
- **Gating with `NeverTrigger`.** Rather than adding and removing shortcuts as state changes, `makeShortcut` keeps every shortcut permanently in the list and swaps its *trigger*: when `enabled` is false it uses `Gtk.NeverTrigger.get()`, a trigger that matches no key at all. So `Escape` is inert outside selection mode, without churning the controller's shortcut list.

The controller mounts through the window's `controllers` slot (every `GtkWidget` has one for event controllers), and the `enabled` flag is driven straight from render state:

```tsx
controllers={
    <AppShortcuts
        onSearch={() => setSearchMode((mode) => !mode)}
        onEscape={cancelSelection}
        escapeEnabled={selecting}
    />
}
```

When `selecting` is false, `escapeEnabled` is false, so `Escape` resolves to `NeverTrigger` and passes through untouched; with the task editor open, the untouched key reaches the content stack's `AdwNavigationView`, whose built-in Escape handling pops the page. Enter selection mode and the next render swaps in the real `parseString("Escape")` trigger. The behavior tracks state with no imperative connect/disconnect.

The `Delete` key is scoped differently: deleting only makes sense while a task is open, so the `Task` screen mounts its own `GtkShortcutController` through its toolbar view's `controllers` slot (shown in [The Task Editor](/tutorial/the-task-editor)). The shortcut exists exactly while the screen does, with no enabling flag at all.

## The shortcuts dialog: `AdwShortcutsDialog`

The `win.shortcuts` action opens a dialog listing every shortcut. `AdwShortcutsDialog` is the standard GNOME "Keyboard Shortcuts" surface: a searchable dialog of grouped, titled sections. Tasks builds it the same declarative way as every other dialog, in `components/shortcuts.tsx`:

```tsx
import { Dialog } from "@gtkx/components/adw";
import { AdwShortcutsDialog, AdwShortcutsItem, AdwShortcutsSection } from "@gtkx/jsx/adw";

export const Shortcuts = ({ onClose }: { onClose: () => void }) => (
    <Dialog component={AdwShortcutsDialog} onClose={onClose}>
        <AdwShortcutsSection title="General">
            <AdwShortcutsItem title="New task" accelerator="<Control>n" />
            <AdwShortcutsItem title="Search tasks" accelerator="<Control>f" />
            <AdwShortcutsItem title="Preferences" accelerator="<Control>comma" />
            <AdwShortcutsItem title="Keyboard shortcuts" accelerator="<Control>question" />
        </AdwShortcutsSection>
        <AdwShortcutsSection title="Tasks">
            <AdwShortcutsItem title="Delete task" accelerator="Delete" />
            <AdwShortcutsItem title="Close task" accelerator="Escape" />
        </AdwShortcutsSection>
    </Dialog>
);
```

Each `AdwShortcutsSection` is a titled group, and each `AdwShortcutsItem` renders one row: a `title` plus its formatted `accelerator` (`"<Control>n"` displays as `Ctrl+N`). Both are ordinary declarative `children` containers, so there is no imperative `.add()` wiring, and the whole tree updates like any other JSX.

An `accelerator` string is display text, not a binding, so a hand-written one has to be kept in sync with the real shortcut. Rows backed by an action can skip that. `AdwShortcutsItem` also takes an `actionName` prop that reads the accelerator back from whatever `actionAccels` registered, so `actionName="win.new"`, `actionName="win.preferences"`, and `actionName="win.shortcuts"` keep those three rows correct on their own.

The other three rows have no action to point at, so their `accelerator` has to be written by hand and kept in sync. `<Control>f` comes from the window's `AppShortcuts` controller, and `Delete` from the task screen's own controller. The "Close task" `Escape` comes from `AdwNavigationView`'s built-in pop rather than from any controller in Tasks.

`<Dialog>` (from `@gtkx/components/adw`, documented in [Feedback and Dialogs](/tutorial/feedback-and-dialogs)) presents the dialog through a portal on mount and force-closes it on unmount, exactly like Preferences and About. It takes the dialog widget as its `component` prop (here `AdwShortcutsDialog`) and its `onClose` clears `showShortcuts` when the user dismisses the dialog. The action handler flips a state flag:

```tsx
onShortcuts={() => setShowShortcuts(true)}
```

and the window renders `{showShortcuts ? <Shortcuts onClose={() => setShowShortcuts(false)} /> : null}` alongside the other dialogs.

## Putting the pieces together

A single command like "create a new task" now has three front doors, all converging on the same `newTask` behavior:

- the **menu** item `{ label: "New Task", action: "win.new" }`,
- the **accelerator** `{ detailedActionName: "win.new", accels: ["<Control>n"] }`,
- and the header-bar **button** `<GtkButton onClicked={newTask} />`.

The first two resolve through `win.new`, whose `onActivate` is `newTask`; the button skips the action system and calls `newTask` directly.

Meanwhile `Ctrl+F`, `Escape`, and `Delete` stay out of the action system entirely, living as `GtkShortcut`s that are gated by state or by the lifetime of the screen that mounts them, because their meaning is view-local. And `app.complete-task` / `app.open-task` sit on the application so a notification has actions alive even when no window is focused. Choosing the right home for each command, `win.*`, `app.*`, or a plain shortcut controller, is the whole discipline here.

## Next

Continue to [Selection Mode](/tutorial/selection-and-batch) to follow where the `win.select` action leads: a distinct mode for completing, moving, and deleting many tasks at once.
