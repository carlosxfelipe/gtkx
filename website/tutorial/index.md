---
description: "Tour a complete GNOME Tasks app built with GTKX, where real GTK4 and Adwaita widgets are rendered from the React components you already know."
---

# Build a Tasks App with GTKX

**Tasks** is a complete, real GNOME task manager (application ID `com.gtkx.tutorial`) built with GTKX. It looks and behaves like a native GNOME app because it *is* one: every list, row, header bar, and dialog you see is a real GTK4 or Adwaita widget, driven from React components you already know how to write.

<picture>
  <source srcset="/tasks-screenshot.webp" type="image/webp" />
  <img src="/tasks-screenshot.png" width="900" height="600" loading="lazy" alt="The Tasks app: an adaptive Adwaita window with a sidebar of smart views and colored user lists on the left, and a boxed task list on the right." />
</picture>

The app is already written. Rather than building it file by file, this tutorial tours the finished source and explains how each piece works, with snippets copied straight from `examples/tutorial/src`. You will recognize the shape immediately: `useState`, `useEffect`, `useRef`, props, keyed lists, controlled inputs. What is new is the *target*: instead of DOM nodes, your JSX renders `AdwApplicationWindow`, `AdwNavigationSplitView`, `GtkListBox`, and friends.

## What Tasks is

The app centers on an adaptive `AdwNavigationSplitView`: a sidebar of smart views (All Tasks, Today, Important, Trash) plus user-created lists, next to a content pane that shows a boxed task list and swaps to a task editor when you open a task. On a narrow window the two panes collapse into a single push/pop column, automatically.

Here is the app root, the real `App` component from `app.tsx`, with the notification actions elided:

```tsx
export function App() {
    const notify = useRef<NotifyHandlers>({ complete: () => {}, open: () => {} });
    return (
        <AdwApplication
            actionAccels={[
                { detailedActionName: "win.new", accels: ["<Control>n"] },
                { detailedActionName: "win.preferences", accels: ["<Control>comma"] },
                { detailedActionName: "win.shortcuts", accels: ["<Control>question"] },
            ]}
            actions={notificationActions}
        >
            <TasksWindow notify={notify} />
        </AdwApplication>
    );
}
```

`<AdwApplication>` provides the GTK4 application object. Its `actionAccels` prop wires keyboard accelerators to named actions. Inside it, `<TasksWindow>` renders an `<AdwApplicationWindow>` whose body is the split view, wrapped in an `<AdwToastOverlay>` so undo toasts can appear over everything:

```tsx
<AdwApplicationWindow ref={windowRef} title="Tasks" /* ... */>
    <AdwToastOverlay ref={toastOverlayRef}>
        <AdwNavigationSplitView
            collapsed={collapsed}
            showContent={showContent}
            sidebar={<AdwNavigationPage title="Tasks">{/* Sidebar */}</AdwNavigationPage>}
            content={
                <AdwNavigationPage title={titleFor(selection, lists)}>
                    {/* task list, editor, or selection view */}
                </AdwNavigationPage>
            }
        />
    </AdwToastOverlay>
    {/* Preferences, About, Shortcuts, NewListDialog, DeleteConfirmation dialogs */}
</AdwApplicationWindow>
```

That is the entire skeleton. The window mounts from a three-line entry point (`index.tsx`):

```tsx
import { createRoot } from "@gtkx/react";
import { App } from "./app.js";

createRoot().render(<App />);
```

## What GTKX is

GTKX is a React reconciler that renders real GTK4 and Adwaita widgets instead of the DOM (see [Why GTKX](/guide/why-gtkx)). The intrinsic elements you import throughout this tutorial come from three paths: `@gtkx/jsx/adw` for Adwaita, `@gtkx/jsx/gtk` for GTK4, and `@gtkx/jsx/gio` for Gio. High-level components come from `@gtkx/components` (with the Adwaita ones, like `NavigationView` and `Dialog`, under `@gtkx/components/adw`), and animation helpers from `@gtkx/animate`.

::: info React knowledge transfers directly
State, effects, refs, context, keys, and controlled components all work exactly as they do on the web. The parts to learn are on the GTK4 side: which widget does what, how Adwaita's adaptive containers behave, and the handful of GTKX conventions for slots, refs, and signals. This tutorial leads with those.
:::

## Prerequisites

Working familiarity with **React** and **TypeScript** is all you bring to this tutorial. You do not need any prior GTK4, GObject, or C experience. For the system requirements (Linux with the GTK4, Adwaita, and GLib development libraries, plus Node.js 24 or newer), see [Getting Started](/guide/getting-started).

## A tour of the features

Each feature in Tasks demonstrates a distinct GTKX or GTK4 capability. As you read the rest of this tutorial, this is the map:

| Feature | What you see in the app | GTKX / GTK4 capability it teaches |
|---|---|---|
| **Local persistence** | Tasks and lists survive a restart | A `useTasks()` hook over a JSON store (`node:fs` reading and writing in the XDG data dir); lightweight UI state via `useSetting` + `GSettings` |
| **Adaptive layout** | Sidebar and content sit side by side, then collapse to one column when the window narrows | `AdwNavigationSplitView` with a controlled `collapsed` prop, driven by an `AdwBreakpoint`'s `apply`/`unapply` signals |
| **Boxed lists** | Tasks in a rounded, card-style list | `GtkListBox` / `AdwActionRow` in the `boxed-list` style |
| **Drag to reorder** | Drag a task row to a new position | `GtkDragSource` + `GtkDropTarget` mounted on a widget's `controllers` slot, closing the loop in React state |
| **Filter and search** | An All / Open / Done segmented toggle, plus `Ctrl+F` text search | `AdwToggleGroup` + `AdwToggle`; `GtkSearchBar` + `GtkSearchEntry` |
| **Selection mode** | Batch Complete / Move / Delete with a revealed bottom bar | A `selecting` state, a dedicated `SelectionView`, and a `GtkActionBar` in the toolbar's `bottomBar` slot |
| **Task editor** | A form for title, notes, due date, and an importance toggle | `AdwClamp`, preference-style rows, a `GtkCalendar`, and a `GtkTextView`, in a `TaskDetail` component |
| **Preferences** | Appearance, default sort, reminder timing | An `AdwPreferencesDialog` rendered through a portal, with two-way `useSetting` bindings |
| **Theming** | Follow the system theme, or force light / dark | `applyColorScheme` feeding `Adw.StyleManager` |
| **Undo toasts** | "Moved to Trash" with an Undo button | `Adw.Toast` added imperatively to an `AdwToastOverlay` |
| **Desktop reminders** | A system notification when a task is due | A `useReminders` hook calling `app.sendNotification` (`Gio.Notification`), with app-scoped `GSimpleAction`s handling the notification buttons |
| **Keyboard shortcuts** | `Ctrl+N`, `Ctrl+F`, `Escape`, `Delete` | `GtkShortcutController` + `GtkShortcut`, `actionAccels`, and `GSimpleAction` |

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

You can read it straight through or jump to whichever feature you need. Every page quotes the actual source, so you can always open the matching file under `examples/tutorial/src` and follow along.

## Next

Continue to **The Application Shell** to see how the application, window, and adaptive split view fit together. To scaffold the project and get the edit, save, watch-it-update loop running first, see [Getting Started](/guide/getting-started).
