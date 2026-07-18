---
description: "Desktop reminders with Gio.Notification: application-scoped actions that survive cold starts and fire even after the window is closed."
---

# Reminders and Notifications

Tasks have due dates, so the app fires a desktop notification when one is coming up. This is the one feature that has to keep working when the app is closed: the notification the user taps might be what launches the process. That constraint shapes the whole design, so before any React, understand the Gio concepts it depends on:

- A **`Gio.Notification`** is a plain data object (title, body, priority, buttons). It does not run code. Every interactive part of it points at a named action string like `app.complete-task`, and the shell invokes that action on your `Gio.Application`, possibly after cold-starting it.
- Because the process can be cold-started with no window, the action must be **application-scoped** (`app.` prefix), installed on the application itself: a `win.` action would have no window to target. [Actions, Menus, and Shortcuts](/tutorial/actions-menus-shortcuts) covers the `win.*` / `app.*` split in full.

## Building the notification

`src/notifications.ts` holds the entire notification-building logic: one pure function that turns a `Task` into a `Gio.Notification`:

```ts
import * as Gio from "@gtkx/gi/gio";
import * as GLib from "@gtkx/gi/glib";
import { formatDateTime } from "./format.js";
import type { Task } from "./types.js";

export const buildReminder = (task: Task): Gio.Notification => {
    const notification = Gio.Notification.new(task.title);
    notification.setBody(`Due ${formatDateTime(task.due)}`);
    notification.setPriority(Gio.NotificationPriority.HIGH);
    notification.addButtonWithTarget("Mark Complete", "app.complete-task", GLib.Variant.newString(task.id));
    notification.setDefaultActionAndTarget("app.open-task", GLib.Variant.newString(task.id));
    return notification;
};
```

Reading it against the Gio API:

- `Gio.Notification.new(title)` is the static constructor. GObject-Introspection method names come through as camelCase, so `g_notification_set_body` is `setBody`, `set_priority` is `setPriority`, and so on.
- `Gio.NotificationPriority.HIGH` asks the shell to show the notification more prominently, which is right for a time-sensitive reminder.
- `addButtonWithTarget(label, action, target)` adds a button that invokes `app.complete-task` with a `GLib.Variant` payload. `setDefaultActionAndTarget(action, target)` is what fires when the user clicks the notification body itself, here `app.open-task`.
- The target is always `GLib.Variant.newString(task.id)`. Gio actions carry at most one parameter, a `GLib.Variant`, so the task id is boxed into a string variant. The `*WithTarget` variants take the variant directly instead of forcing you to escape the id into a detailed action string like `app.open-task::<id>`.

`formatDateTime` (from `src/format.ts`) renders the ISO due string as a locale date-time; the only Gio surface in this file is the notification itself.

## The reminder sweep

Gio will not fire a `Gio.Notification` at a due time for you; a notification is sent the moment you call `sendNotification`. So the app polls. `src/hooks/use-reminders.ts` is a hook that sweeps the task list on an interval and sends a reminder for anything crossing its lead time:

```ts
import { useEffect, useRef } from "react";
import type { Task } from "../types.js";

export const useReminders = (tasks: Task[], reminderMinutes: number, sendReminder: (task: Task) => void): void => {
    const notified = useRef(new Set<string>());

    useEffect(() => {
        const sweep = (): void => {
            const nowMs = Date.now();
            const leadMs = reminderMinutes * 60_000;
            for (const task of tasks) {
                if (task.done || task.deleted || !task.due || notified.current.has(task.id)) continue;
                const remaining = new Date(task.due).getTime() - nowMs;
                if (remaining <= leadMs && remaining > -86_400_000) {
                    sendReminder(task);
                    notified.current.add(task.id);
                }
            }
        };
        sweep();
        const handle = setInterval(sweep, 60_000);
        return () => clearInterval(handle);
    }, [tasks, reminderMinutes, sendReminder]);
};
```

The mechanics:

- **`notified` is a `useRef<Set<string>>`, not state.** It records which task ids have already fired so a task is not re-notified on every 60-second tick. It is a ref because writing to it must not trigger a re-render, and it must persist across renders without being a dependency.
- **`leadMs` comes from `reminderMinutes`**, the `reminder-minutes` GSettings preference read in the window (see below). A task fires when it is due within the lead window.
- **The window is `remaining <= leadMs && remaining > -86_400_000`.** So a reminder fires from `reminderMinutes` before the due time up to 24 hours (`86_400_000` ms) after it. Tasks overdue by more than a day are skipped, avoiding a burst of stale notifications the first time the app opens after being off for a while.
- **`sweep()` runs once immediately, then every 60 seconds** via `setInterval`. The effect's cleanup calls `clearInterval(handle)`, so the timer is torn down when dependencies change or the component unmounts. Because GTKX drives GTK4 from the Node.js event loop, plain `setInterval` and `setTimeout` are the right scheduling tools; application code never needs `GLib.timeoutAdd`.

## Wiring the sweep to the application

Inside `TasksWindow` (`src/app.tsx`), the lead time is a setting and the send is one line bound to the application:

```tsx
const app = useApplication();
// ...
const [reminderMinutes] = useSetting(schema, "reminder-minutes");
// ...
const sendReminder = useCallback((task: Task) => app.sendNotification(task.id, buildReminder(task)), [app]);
useReminders(tasks, reminderMinutes, sendReminder);
```

`useApplication()` returns the live `Gtk.Application` from the nearest `<AdwApplication>` ancestor. `Gtk.Application` is a `Gio.Application`, so it carries `sendNotification(id, notification)`.

The first argument to `sendNotification` is a notification **id**, and it is keyed to `task.id` on purpose. When the shell receives a second notification with an id it already has for this app, it **replaces** the first rather than stacking a duplicate. So if the sweep ever re-fires for the same task (across an app restart, say, where the in-memory `notified` set is empty again), the user sees one updated reminder. `sendReminder` is wrapped in `useCallback` keyed on `app` so its identity is stable, keeping the hook's effect from re-subscribing on every render.

## Installing the app-scoped actions

The actions the notification targets are declared in the `actions` slot of `<AdwApplication>` in the top-level `App` component:

```tsx
export function App() {
    const notify = useRef<NotifyHandlers>({ complete: () => {}, open: () => {} });
    return (
        <AdwApplication
            actionAccels={[/* window accelerators, shown in The Application Shell */]}
            actions={
                <>
                    <GSimpleAction
                        name="complete-task"
                        parameterType={GLib.VariantType.new("s")}
                        onActivate={(parameter) => {
                            if (parameter) notify.current.complete(parameter.getString()[0]);
                        }}
                    />
                    <GSimpleAction
                        name="open-task"
                        parameterType={GLib.VariantType.new("s")}
                        onActivate={(parameter) => {
                            if (parameter) notify.current.open(parameter.getString()[0]);
                        }}
                    />
                </>
            }
        >
            <TasksWindow notify={notify} />
        </AdwApplication>
    );
}
```

Points to notice:

- **`name="complete-task"` becomes `app.complete-task`.** Actions placed under the application element are added to its action map with the `app.` prefix, which is exactly the string `buildReminder` targets. (Window-scoped actions, by contrast, live in the window's `actions` slot and become `win.`-prefixed.)
- **`parameterType={GLib.VariantType.new("s")}` declares the action takes a single string parameter.** This must match the `GLib.Variant.newString(task.id)` target attached to the notification; a mismatch means the action refuses to activate.
- **`onActivate` receives the `GLib.Variant | null` parameter.** The signal is typed nullable because an action declared without a `parameterType` is activated with no parameter at all. This one always carries its string, so `if (parameter)` narrows the type; the null branch never runs here. `parameter.getString()` returns a `[value, length]` tuple in the GI bindings, so `parameter.getString()[0]` pulls out the task id.

## Bridging the action to the window

The `onActivate` handlers do not touch task state directly. They call through a ref:

```tsx
type NotifyHandlers = { complete: (id: string) => void; open: (id: string) => void };

function TasksWindow({ notify }: { notify: RefObject<NotifyHandlers> }) {
    // ...
    notify.current = {
        complete: (id) => api.setDone(id, true),
        open: (id) => {
            setSelection({ kind: "smart", view: "all" });
            openTask(id);
        },
    };
    // ...
}
```

The reason for the indirection: the `GSimpleAction` elements live at the **application** level, outside `TasksWindow`, so their handlers cannot close over the window's state (`api.setDone`, `setSelection`, the navigation ref behind `openTask`). The `notify` ref is created in `App`, passed down, and reassigned on every `TasksWindow` render to point at the current handlers. So `app.complete-task` marks the task done, and `app.open-task` navigates to the task's route, which also reveals the content pane on a collapsed (mobile) layout (`openTask` is covered in [The Application Shell](/tutorial/app-shell)). The action stays installed once for the life of the application; the ref keeps it pointed at the window's live handlers.

This is also what makes cold-start work. If the shell launches the app to deliver `app.open-task`, the application starts up, `TasksWindow` mounts and assigns `notify.current`, and the action then resolves to the handler that opens the right task.

## Desktop-file requirements

Routing depends on one thing outside the code: the app's desktop entry, named after its application ID, must set `X-GNOME-UsesNotifications=true` and `DBusActivatable=true`. The second is what makes cold start work: it lets the shell D-Bus-activate the app to deliver an action, so tapping a reminder while the app is closed launches the process and fires `app.open-task` rather than doing nothing. [Packaging and Shipping](/tutorial/packaging) shows the full entry.

## Next

Continue to [Feedback and Dialogs](/tutorial/feedback-and-dialogs) to see how the app confirms and softens destructive actions with toasts and alert dialogs.
