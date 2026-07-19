---
description: "Building a Gio.Notification with buildReminder, sweeping the task list on an interval, and the application-scoped actions its buttons invoke."
---

# Reminders and Notifications

A task with a due date fires a desktop notification. This chapter covers the notification model, the sweep that sends it, and the application-scoped actions its buttons invoke.

## Sending the reminder

### Building the notification

`src/notifications.ts` turns a `Task` into a `Gio.Notification`:

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

A Gio action carries at most one parameter, so the task id is boxed into a string variant as the target of both the button and the default action.

Inside `TasksWindow` (`src/app.tsx`), the lead time is a setting and the send is one line bound to the application:

```tsx
const app = useApplication();
// ...
const [reminderMinutes] = useSetting(schema, "reminder-minutes");
// ...
const sendReminder = useCallback((task: Task) => app.sendNotification(task.id, buildReminder(task)), [app]);
useReminders(tasks, reminderMinutes, sendReminder);
```

The first argument to `sendNotification` is a notification id, keyed to `task.id` so a second send for the same task replaces the first instead of stacking a duplicate.

### The reminder sweep

Nothing schedules a notification for a due time, so the app sweeps on an interval. `src/hooks/use-reminders.ts` walks the task list and sends a reminder for anything crossing its lead time:

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

The `-86_400_000` bound cuts the window off 24 hours past the due time, so opening the app after a long gap skips stale reminders.

## Handling the notification

### The app-scoped actions

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

Under the application element, `name="complete-task"` becomes [`app.complete-task`](/tutorial/actions-menus-shortcuts), the string `buildReminder` targets, and `parameterType` must match the variant attached to the notification. `getString()` returns a `[value, length]` tuple, so the id is `parameter.getString()[0]`.

### Bridging to the window

The `GSimpleAction` elements live at the application level, so their handlers cannot close over the window's state. They call through a ref instead:

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

This is what makes cold start work: when the shell launches the app to deliver `app.open-task`, `TasksWindow` mounts, assigns `notify.current`, and the action resolves to the handler that opens the right task.

Delivery depends on the app's desktop entry setting `X-GNOME-UsesNotifications=true` and `DBusActivatable=true`, shown in [Packaging and Shipping](/tutorial/packaging).

## Next

Continue to [Feedback and Dialogs](/tutorial/feedback-and-dialogs) for toasts and alert dialogs.
