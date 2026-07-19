---
description: "Name the app's commands as GActions and reach them from a menu and the keyboard."
---

# Menus, Accelerators, and Shortcuts

In [Opening a Task](/tutorial/the-task-editor) the content pane became an editor, so a task can be opened, edited, and closed with the pointer. Every command in the app still requires the pointer, and the header bar is running out of room for buttons.

Look at the new-task button in the content header. It is one command, with one handler, reachable from one place. GNOME apps expose that same command from three: the button, the primary menu, and a key. You do not want three copies of the handler. You want to name the command once and let all three refer to it by name.

That name is a GAction. In this chapter you declare the window's commands as actions, hang accelerators on them, put them in a menu, and then add the keys that are not commands at all.

## Commands as actions

An action is a named, activatable thing that belongs to either the window or the application. GTKX exposes actions as elements, so a group of them is an ordinary component.

Create `src/components/window-actions.tsx`:

```tsx
import { GSimpleAction } from "@gtkx/jsx/gio";
import { useStore } from "../store/index.js";
import { addListId } from "../store/selectors.js";

export const WindowActions = () => {
    const newTask = (): void => {
        const { selection, lists, addTask, openTask } = useStore.getState();
        const id = addTask(addListId(selection, lists), "New Task");
        if (id) openTask(id);
    };

    return (
        <>
            <GSimpleAction name="new" onActivate={newTask} />
            <GSimpleAction name="shortcuts" onActivate={() => showDialog("shortcuts")} />
            <GSimpleAction name="about" onActivate={() => showDialog("about")} />
        </>
    );
};
```

`showDialog` does not exist yet, so this file does not compile on its own. You add it to the store two sections down, and the finished file appears there.

`newTask` reaches the store through `useStore.getState()` rather than through a hook. The handler runs on activation and reads the state at that moment, so it does not need the component to re-render when `selection` changes. That is the escape hatch the store has offered since [Adding Tasks with a Store](/tutorial/the-task-store): the store is not React state, so any function can read it.

Mount the group in the window's `actions` slot. In `src/components/window.tsx`:

```tsx
import { WindowActions } from "./window-actions.js";

// ...

<AdwApplicationWindow
    ref={windowRef}
    title="Tasks"
    onCloseRequest={() => quit()}
    actions={<WindowActions />}
>
    {/* ... */}
</AdwApplicationWindow>
```

**The scope prefix comes from the mount point, not from the name.** The element says `name="new"`, and because it is mounted in the window's `actions` slot, the full name of that action is `win.new`. Put the identical element in the application's `actions` slot instead and it becomes `app.new`. A command that needs a window to act on belongs on the window; a command that makes sense with no window open belongs on the application.

Once a command has a name, a widget can point at it instead of carrying a handler. In `src/components/content-pane.tsx`:

```tsx
<GtkButton
    iconName="list-add-symbolic"
    tooltipText="New Task (Ctrl+N)"
    actionName="win.new"
/>
```

::: warning The button is greyed out and clicking it does nothing
A widget whose `actionName` resolves to no action renders insensitive. Check the prefix first: `actionName="app.new"` against an action mounted in the window's slot finds nothing, and neither does a bare `actionName="new"`.
:::

## Accelerators

An accelerator maps a key combination to an action name. Accelerators are registered on the application even when they point at window-scoped actions, because the application owns the keyboard mapping. The name still resolves against whichever window has focus, so `win.new` fires the action of the window you are looking at.

In `src/app.tsx`:

```tsx
<AdwApplication
    actionAccels={[
        { detailedActionName: "win.new", accels: ["<Control>n"] },
        { detailedActionName: "win.shortcuts", accels: ["<Control>question"] },
    ]}
>
    <Window />
</AdwApplication>
```

`accels` is an array because one action can answer to several combinations. The string form (`<Control>n`, `<Shift><Control>Delete`, `F10`) is what GTK4 parses everywhere, and it is also what a menu item reads to draw `Ctrl+N` along its right-hand edge. You write the accelerator once and the menu label follows.

## The primary menu

Now the same commands need a home for the pointer. A GNOME primary menu is a `GtkMenuButton` in the header bar whose model is a menu of action names.

Create `src/components/main-menu.tsx`:

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
                    { section: [{ label: "New Task", action: "win.new" }] },
                    { section: [{ label: "Keyboard Shortcuts", action: "win.shortcuts" }] },
                    { section: [{ label: "About Tasks", action: "win.about" }] },
                ]}
            />
        }
    />
);
```

`Menu` from `@gtkx/components` builds a menu model from the `items` array. An entry with `section` groups its children and draws a separator between groups. An entry with `label` and `action` is a menu item, and the action name is all the wiring it needs: no handler, no callback threaded down from the window, and the item goes insensitive by itself when the action is missing.

`primary` marks this button as the window's primary menu, which is what makes F10 open it. You do not register that key yourself.

Put the button at the end of the content header. In `src/components/content-pane.tsx`:

```tsx
import { MainMenu } from "./main-menu.js";

// ...

<AdwHeaderBar
    // ...
    end={<MainMenu />}
/>
```

## Mounting dialogs

Two of those menu items open a dialog, so the store has to say which dialog is showing. A dialog is a state rather than an event: it is either up or it is not, and the window should be able to describe that in a single field.

In `src/types.ts`:

```ts
export type DialogKind = "none" | "about" | "shortcuts";
```

In `src/store/ui.ts`, add the field to the slice type and to the creator:

```ts
export type UiSlice = {
    // ...
    dialog: DialogKind;
    // ...
    showDialog: (dialog: DialogKind) => void;
};

export const createUiSlice: StateCreator<Store, Mutators, [], UiSlice> = (set) => ({
    // ...
    dialog: "none",
    // ...
    showDialog: (dialog) => set({ dialog }),
});
```

`dialog` describes what is on screen right now, so leave it out of `partialize`. A dialog that happened to be open when you quit should not reappear on the next launch.

`window-actions.tsx` can now read that setter, which finishes the file:

```tsx
import { GSimpleAction } from "@gtkx/jsx/gio";
import { useStore } from "../store/index.js";
import { addListId } from "../store/selectors.js";

export const WindowActions = () => {
    const showDialog = useStore((state) => state.showDialog);

    const newTask = (): void => {
        const { selection, lists, addTask, openTask } = useStore.getState();
        const id = addTask(addListId(selection, lists), "New Task");
        if (id) openTask(id);
    };

    return (
        <>
            <GSimpleAction name="new" onActivate={newTask} />
            <GSimpleAction name="shortcuts" onActivate={() => showDialog("shortcuts")} />
            <GSimpleAction name="about" onActivate={() => showDialog("about")} />
        </>
    );
};
```

One component renders whichever dialog the store names. Create `src/components/dialogs.tsx`:

```tsx
import { useStore } from "../store/index.js";
import { About } from "./about.js";
import { Shortcuts } from "./shortcuts.js";

export const Dialogs = () => {
    const dialog = useStore((state) => state.dialog);
    const showDialog = useStore((state) => state.showDialog);
    const close = () => showDialog("none");

    switch (dialog) {
        case "about":
            return <About onClose={close} />;
        case "shortcuts":
            return <Shortcuts onClose={close} />;
        case "none":
            return null;
    }
};
```

**This is the dialog contract, and every dialog in the rest of the tutorial follows it.** Mounting the component presents the dialog, and unmounting it dismisses the dialog. You never call `present` or `close` yourself: you change `dialog` in the store and the reconciler does the rest.

The widget an Adwaita dialog element creates is not laid out inside the widget tree that surrounds it, which is why it does not matter that `Dialogs` sits at the bottom of the window's children. It renders through a portal and is presented against the window that contains it. The general mechanism, including `createPortal` for the cases you drive by hand, is in [Modals and Portals](/guide/modals-and-portals); you do not need any of it to follow this chapter.

`onClosed` is where the state that mounted the dialog gets cleared. That signal fires whichever way the dialog goes away, including Escape and the close button, so routing it back to `showDialog("none")` keeps the store honest about what is on screen.

::: warning The dialog closes and immediately reopens, or refuses to close at all
`onClosed` is not wired. The dialog widget is gone, the store still says `dialog: "about"`, the component is still mounted, and the next render presents it again. Every dialog component in this app takes an `onClose` prop and hands it to `onClosed` for exactly that reason.
:::

Now the two dialogs. Both are pure Adwaita, and both take the callback and do nothing else.

Create `src/components/about.tsx`:

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { AdwAboutDialog } from "@gtkx/jsx/adw";

export const About = ({ onClose }: { onClose: () => void }) => {
    return (
        <AdwAboutDialog
            onClosed={onClose}
            applicationName="Tasks"
            applicationIcon="com.gtkx.tutorial"
            version="1.0.0"
            developerName="GTKX"
            website="https://gtkx.dev"
            issueUrl="https://github.com/gtkx-org/gtkx/issues"
            copyright="© 2026 GTKX Contributors"
            licenseType={Gtk.License.MPL_2_0}
            developers={["GTKX Contributors"]}
            comments="A task manager built with GTKX to showcase React, GTK4, and Adwaita."
        />
    );
};
```

`applicationIcon` is an icon name, and it is the application ID you chose when you scaffolded the project. Nothing is drawn in that spot until the icon is installed alongside the app, which happens in [Appendix B](/tutorial/packaging).

Create `src/components/shortcuts.tsx`:

```tsx
import { AdwShortcutsDialog, AdwShortcutsItem, AdwShortcutsSection } from "@gtkx/jsx/adw";

export const Shortcuts = ({ onClose }: { onClose: () => void }) => (
    <AdwShortcutsDialog onClosed={onClose}>
        <AdwShortcutsSection title="General">
            <AdwShortcutsItem title="New task" accelerator="<Control>n" />
            <AdwShortcutsItem title="Search tasks" accelerator="<Control>f" />
            <AdwShortcutsItem title="Keyboard shortcuts" accelerator="<Control>question" />
        </AdwShortcutsSection>
        <AdwShortcutsSection title="Tasks">
            <AdwShortcutsItem title="Delete task" accelerator="Delete" />
            <AdwShortcutsItem title="Close task" accelerator="Escape" />
        </AdwShortcutsSection>
    </AdwShortcutsDialog>
);
```

`accelerator` takes the same string form as `actionAccels`, and Adwaita draws it as key caps. This dialog is documentation rather than wiring: adding an item here does not create the key. The two items under Tasks are the keys you add next.

Mount `Dialogs` inside the window. In `src/components/window.tsx`:

```tsx
import { Dialogs } from "./dialogs.js";

// ...

<AdwApplicationWindow
    // ...
    actions={<WindowActions />}
>
    {/* ... */}
    <Dialogs />
</AdwApplicationWindow>
```

## Keys that are not commands

Search, close, and delete want keys too. None of them belongs in a menu: "Close task" is meaningless with no task open, and search is a view state rather than a thing you do. That gives you the rule.

**A command you would put in a menu is an action. A key that only makes sense in a particular view state is a shortcut.** Actions are global, named, and discoverable. Shortcuts are local, anonymous, and conditional.

Shortcuts live on a `GtkShortcutController`, which mounts in the window's `controllers` slot.

Create `src/components/app-shortcuts.tsx`:

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { GtkShortcut, GtkShortcutController } from "@gtkx/jsx/gtk";
import { useStore } from "../store/index.js";

const shortcut = (accelerator: string, run: () => void, enabled: boolean) => (
    <GtkShortcut
        trigger={enabled ? Gtk.ShortcutTrigger.parseString(accelerator) : Gtk.NeverTrigger.get()}
        action={Gtk.CallbackAction.new(() => {
            run();
            return true;
        })}
    />
);

export const AppShortcuts = () => {
    const selectedTaskId = useStore((state) => state.selectedTaskId);
    const closeTask = useStore((state) => state.closeTask);

    const toggleSearch = (): void => {
        const { searchMode, setSearchMode } = useStore.getState();
        setSearchMode(!searchMode);
    };

    const deleteSelected = (): void => {
        const { selectedTaskId: id, moveToTrash, closeTask: close } = useStore.getState();
        if (id === null) return;
        moveToTrash(id);
        close();
    };

    return (
        <GtkShortcutController
            scope={Gtk.ShortcutScope.GLOBAL}
            shortcuts={
                <>
                    {shortcut("<Control>f", toggleSearch, true)}
                    {shortcut("Escape", closeTask, selectedTaskId !== null)}
                    {shortcut("Delete", deleteSelected, selectedTaskId !== null)}
                </>
            }
        />
    );
};
```

A shortcut pairs a trigger with an action. `Gtk.ShortcutTrigger.parseString` reads the same accelerator strings you have been writing, and `Gtk.CallbackAction.new` wraps a function. Returning `true` reports the key as handled, so it stops travelling.

`scope={Gtk.ShortcutScope.GLOBAL}` is what makes these fire wherever focus sits inside the window. Leave it out and the keys work only while focus is on the controller's own widget, which for a window-level controller is almost never what you want.

**Gating a shortcut swaps its trigger rather than removing it.** Escape must do nothing when no task is open, and `Gtk.NeverTrigger.get()` is a trigger that matches no key at all. The shortcut stays in the list for the life of the window, and `selectedTaskId` flipping between null and an id rewrites one property instead of adding and removing children. It also leaves the key free: a shortcut that never triggers never claims Escape, so a presented dialog still closes on it.

Mount the controller in `src/components/window.tsx`:

```tsx
import { AppShortcuts } from "./app-shortcuts.js";

// ...

<AdwApplicationWindow
    // ...
    actions={<WindowActions />}
    controllers={<AppShortcuts />}
>
```

## Run it

```
npm run dev
```

- Press `Ctrl+N`. A task called "New Task" appears and the content pane opens it for editing, with the title field ready.
- Press `F10`, or click the menu button at the end of the content header. The primary menu opens, and the New Task item shows `Ctrl+N` along its right-hand edge, a label you never wrote.
- Press `Ctrl+question` (`Ctrl+Shift+/` on a US layout). The keyboard shortcuts dialog appears. Press `Escape` and it goes away, and pressing `Ctrl+question` again brings it back rather than doing nothing.
- With a task open, press `Escape` and the pane returns to the list. Press `Escape` again with no task open and nothing happens: no flicker, no navigation.

## Summary

- **An action is a named command**, and its scope prefix comes from the slot it is mounted in: `win.new` in the window's `actions`, `app.new` in the application's.
- **A widget points at an action by name** through `actionName`, so the button, the menu item, and the accelerator share one handler.
- **`actionAccels` maps keys to action names** on the application, and the same string is what a menu item draws as its key label.
- **`primary` on a `GtkMenuButton`** is what makes F10 open the primary menu.
- **Mounting a dialog component presents it and unmounting it dismisses it**, with `onClosed` clearing the store field that mounted it.
- **A key that depends on view state is a shortcut, not an action**, and it is disabled by swapping its trigger for `Gtk.NeverTrigger.get()`.

## Next

[Deleting Without Fear](/tutorial/trash-and-toasts) gives the app an undo toast and a confirmation dialog, so the Delete key stops being a one-way door.
