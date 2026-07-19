---
description: "GActions in a React app: named commands driven from menus, keyboard accelerators, and desktop notifications."
---

# Actions, Menus, and Shortcuts

Tasks declares its commands as GActions, binds accelerators to them, and drives them from a menu, a shortcut controller, and a shortcuts dialog.

## Actions

### Window actions

Tasks groups the window commands into one `WindowActions` component:

```tsx
import { GSimpleAction } from "@gtkx/jsx/gio";

const WindowActions = ({ onNew, onSelect, onPreferences, onShortcuts, onAbout }: /* ... */) => (
    <>
        <GSimpleAction name="new" onActivate={onNew} />
        <GSimpleAction name="select" onActivate={onSelect} />
        <GSimpleAction name="preferences" onActivate={onPreferences} />
        <GSimpleAction name="shortcuts" onActivate={onShortcuts} />
        <GSimpleAction name="about" onActivate={onAbout} />
    </>
);
```

The scope prefix comes from where you mount these, not from the `name`. `AdwApplicationWindow` exposes an `actions` slot backed by the window's `addAction`, so a `<GSimpleAction name="new">` placed there becomes `win.new`:

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

Mounting the same element in the `actions` slot of `<AdwApplication>` gives an `app.*` action instead, which is how [Reminders and Notifications](/tutorial/notifications) reaches the app when no window is focused.

### Accelerators

```tsx
<AdwApplication
    actionAccels={[
        { detailedActionName: "win.new", accels: ["<Control>n"] },
        { detailedActionName: "win.preferences", accels: ["<Control>comma"] },
        { detailedActionName: "win.shortcuts", accels: ["<Control>question"] },
    ]}
    actions={<>{/* the app-scoped actions, in Reminders and Notifications */}</>}
>
    <TasksWindow />
</AdwApplication>
```

These accelerators are registered at the application level but point at window-scoped actions, so a shortcut fires while a window owning that action is focused.

### The primary menu

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

Entries carry the same scoped action names declared above, `section` inserts a divider between groups, and `primary` marks this as the window menu so `F10` opens it. `MainMenu` goes in the header bar's `end` slot.

## View shortcuts: `GtkShortcutController` for ephemeral keys

`Ctrl+F` and `Escape` depend on transient view state rather than being commands you would surface in a menu, so Tasks attaches a `GtkShortcutController`:

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

const AppShortcuts = ({ onSearch, onEscape, escapeEnabled }: /* ... */) => (
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

Every shortcut stays in the list permanently and `makeShortcut` swaps its trigger instead: when `enabled` is false the trigger is `Gtk.NeverTrigger.get()`, which matches no key. So `Escape` is inert outside selection mode without churning the controller's shortcut list.

```tsx
controllers={
    <AppShortcuts
        onSearch={() => setSearchMode((mode) => !mode)}
        onEscape={cancelSelection}
        escapeEnabled={selecting}
    />
}
```

## The shortcuts dialog

The `win.shortcuts` action opens `AdwShortcutsDialog`, built declaratively in `components/shortcuts.tsx`:

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

An `accelerator` string is display text, so `"<Control>n"` renders as `Ctrl+N`. `<Dialog>` handles presenting and closing, covered in [How a dialog gets on screen](/tutorial/feedback-and-dialogs#how-a-dialog-gets-on-screen).

## Next

Continue to [Selection Mode](/tutorial/selection-and-batch), where `win.select` leads.
