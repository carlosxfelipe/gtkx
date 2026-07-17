---
description: "Tour a complete GNOME Tasks app built with GTKX, where GTK4 and Adwaita widgets are rendered from the React components you already know."
---

# Build a Tasks App with GTKX

**Tasks** is a complete GNOME task manager (application ID `com.gtkx.tutorial`) built with GTKX. It looks and behaves like a native GNOME app because it *is* one: every list, row, header bar, and dialog you see is a GTK4 or Adwaita widget, driven from React components you already know how to write.

<picture>
  <source srcset="/tasks-screenshot.webp" type="image/webp" />
  <img src="/tasks-screenshot.png" width="900" height="600" loading="lazy" alt="The Tasks app: an adaptive Adwaita window with a sidebar of smart views and colored user lists on the left, and a boxed task list on the right." />
</picture>

The app is already written. Rather than building it file by file, this tutorial tours the finished source and explains how each piece works, with snippets taken from `examples/tutorial`. You will recognize the shape immediately: `useState`, `useEffect`, `useRef`, props, keyed lists, controlled inputs. What is new is the *target*. Your JSX becomes GObject instances: `AdwApplicationWindow`, `AdwHeaderBar`, `GtkListBox`, and friends.

## What Tasks is

The app centers on a split-view navigator from `@gtkx/navigation`, which drives an adaptive `Adw.NavigationSplitView`. A sidebar of smart views (All Tasks, Today, Important, Trash) plus the lists you create sits next to the content pane. That pane shows a boxed task list and pushes a task editor when you open a task. On a narrow window the two panes collapse into a single push/pop column, automatically.

The app root, the `App` component in `app.tsx`, is one `<AdwApplication>`. It provides the GTK4 application object, binds keyboard accelerators through its `actionAccels` prop, and hosts the app-scoped actions that desktop notifications call back into. Inside it sits a single `<TasksWindow>`, which [The Application Shell](/tutorial/app-shell) walks through line by line.

`<TasksWindow>` renders an `<AdwApplicationWindow>` whose body is the navigation tree, wrapped in an `<AdwToastOverlay>` so undo toasts can appear over everything:

```tsx
<AdwApplicationWindow ref={windowRef} title="Tasks" /* ... */>
    <AdwToastOverlay ref={toastOverlayRef}>
        <NavigationContainer ref={navigationRef}>
            <Split.Navigator collapsed={collapsed}>
                <Split.Screen name="Sidebar" options={{ title: "Tasks" }}>
                    {() => <>{/* the sidebar */}</>}
                </Split.Screen>
                <Split.Screen name="Tasks" options={{ title: titleFor(selection, lists) }}>
                    {() => <>{/* the content stack: task list, editor, or selection view */}</>}
                </Split.Screen>
            </Split.Navigator>
        </NavigationContainer>
    </AdwToastOverlay>
    {/* Preferences, About, Shortcuts, NewListDialog, DeleteConfirmation dialogs */}
</AdwApplicationWindow>
```

That is the entire skeleton. The window mounts from a short entry point (`index.tsx`):

```tsx
import { createRoot } from "@gtkx/react";
import { App } from "./app.js";

createRoot().render(<App />);
```

## What GTKX is

GTKX is a React reconciler that renders GTK4 and Adwaita widgets, the widget set GNOME ships (see [Why GTKX](/guide/why-gtkx)). The intrinsic elements you import throughout this tutorial come from `@gtkx/jsx/adw` for Adwaita, `@gtkx/jsx/gtk` for GTK4, and `@gtkx/jsx/gio` for Gio. High-level components come from `@gtkx/components` (with the Adwaita ones, like `Dialog`, under `@gtkx/components/adw`), navigators from `@gtkx/navigation`, and animation helpers from `@gtkx/animated`.

::: info React knowledge transfers directly
State, effects, refs, context, keys, and controlled components all work exactly as they do on the web. The parts to learn are on the GTK4 side: which widget does what, how Adwaita's adaptive containers behave, and the handful of GTKX conventions for slots, refs, and signals. This tutorial leads with those.
:::

## Prerequisites

Working familiarity with **React** and **TypeScript** is all you bring to this tutorial. You do not need any prior GTK4, GObject, or C experience. Tasks needs Linux with the GTK4 (4.20 or later), Adwaita (1.8 or later), and GLib development libraries, plus Node.js 24 or newer. For the full system requirements, see [Getting Started](/guide/getting-started).

## A tour of the features

Each feature in Tasks demonstrates a distinct GTKX or GTK4 capability. As you read the rest of this tutorial, this is the map:

| Feature | What you see in the app | GTKX / GTK4 capability it teaches |
|---|---|---|
| **Local persistence** | Tasks and lists survive a restart | A `useTasks()` hook over a JSON store (`node:fs` reading and writing in the XDG data dir); lightweight UI state via `useSetting` + `GSettings` |
| **Adaptive layout** | Sidebar and content sit side by side, then collapse to one column when the window narrows | A `createSplitViewNavigator()` from `@gtkx/navigation` over `Adw.NavigationSplitView`, with a controlled `collapsed` prop driven by an `AdwBreakpoint`'s `apply`/`unapply` signals |
| **Boxed lists** | Tasks in a rounded, card-style list | `GtkListBox` / `AdwActionRow` in the `boxed-list` style |
| **Drag to reorder** | Drag a task row to a new position | `GtkDragSource` + `GtkDropTarget` mounted on a widget's `controllers` slot, closing the loop in React state |
| **Filter and search** | An All / Open / Done segmented toggle, plus `Ctrl+F` text search | `AdwToggleGroup` + `AdwToggle`; `GtkSearchBar` + `GtkSearchEntry` |
| **Selection mode** | Batch Complete / Move / Delete with a revealed bottom bar | A `selecting` state, a dedicated `SelectionView`, and a `GtkActionBar` in the toolbar's `bottomBar` slot |
| **Task editor** | A form for title, notes, due date, and an importance toggle | `AdwClamp`, preference-style rows, a `GtkCalendar`, and a `GtkTextView`, in a `TaskDetail` component |
| **Preferences** | Appearance, default sort, reminder timing | An `AdwPreferencesDialog` rendered through a portal, with two-way `useSetting` bindings |
| **Theming** | Follow the system theme, or force light / dark | `applyColorScheme` feeding `Adw.StyleManager` |
| **Undo toasts** | `“Water the plants” moved to Trash`, with an Undo button | `Adw.Toast` added imperatively to an `AdwToastOverlay` |
| **Desktop reminders** | A system notification when a task is due | A `useReminders` hook calling `app.sendNotification` (`Gio.Notification`), with app-scoped `GSimpleAction`s handling the notification buttons |
| **Keyboard shortcuts** | `Ctrl+N`, `Ctrl+F`, `Ctrl+,`, `Ctrl+?`, `Escape`, `Delete` | `GtkShortcutController` + `GtkShortcut`, `actionAccels`, and `GSimpleAction` |

## How this tutorial is organized

This tutorial moves from the outside of the app inward, then out to shipping. The pages run in this order:

1. [The Application Shell](/tutorial/app-shell)
2. [Data Model and Persistence](/tutorial/data-and-persistence)
3. [The Sidebar](/tutorial/the-sidebar)
4. [The Task List](/tutorial/the-task-list)
5. [Task Rows and Drag-to-Reorder](/tutorial/task-rows-and-reordering)
6. [Animations](/tutorial/animations)
7. [The Task Editor](/tutorial/the-task-editor)
8. [Actions, Menus, and Shortcuts](/tutorial/actions-menus-shortcuts)
9. [Selection Mode](/tutorial/selection-and-batch)
10. [Preferences and Theming](/tutorial/preferences-and-theming)
11. [Reminders and Notifications](/tutorial/notifications)
12. [Feedback and Dialogs](/tutorial/feedback-and-dialogs)
13. [Testing the App](/tutorial/testing)
14. [Packaging and Shipping](/tutorial/packaging)

You can read it straight through or jump to whichever feature you need. Every page quotes the source, so you can always open the matching file under `examples/tutorial` and follow along.

## Next

Continue to [The Application Shell](/tutorial/app-shell) to see how the application, window, and adaptive split view fit together. To scaffold the project and get the edit, save, watch-it-update loop running first, see [Getting Started](/guide/getting-started).
