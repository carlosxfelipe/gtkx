---
description: "Send a desktop notification before a task is due, with buttons that work when the app is closed."
---

# Reminders That Reach the Desktop

Tasks now has a due date, a lead time in Preferences, and an order you set by dragging, which you added in [Dragging Tasks Into Order](/tutorial/drag-to-reorder). The one thing a due date still does not do is reach you when you are not looking at the app. This chapter fixes that, and in doing so takes the app outside its own window for the first time.

Nothing in the platform is watching your tasks for you. There is no timer service you can hand a due time to and forget about, so the app checks for itself: once when it starts, and once a minute after that. That is the whole scheduling story, and it is small enough to read in one screen.

## Building the notification

A desktop notification on GNOME is a `Gio.Notification`: a title, a body, a priority, and up to a few buttons. What makes it more than a message is that each button names an action, and the shell can activate that action whether or not your app is running.

An action carries at most one parameter, so the task the notification is about has to travel inside that parameter. Box the task id into a string variant and use it as the target of both the button and the notification's default action, which is what fires when you click the notification body itself.

Create `src/notifications.ts`:

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

The two action names carry the `app.` prefix rather than the `win.` prefix you used in [Menus, Accelerators, and Shortcuts](/tutorial/actions-menus-shortcuts). That is deliberate and it is the reason the buttons keep working after you quit: a window-scoped action needs a window to exist, and an application-scoped one does not. You mount both of them a few sections down.

`HIGH` priority is the honest choice for a reminder. It asks the shell to show the notification as a banner rather than only adding it to the message tray, which is the difference between a reminder and a note you find later.

## Sweeping for due tasks

The sweep walks every task and asks whether it deserves a notification right now. A task qualifies when it is open (not done, not in Trash), it has a due time, it has not already been notified in this session, and its due time is ahead of now by no more than the lead you configured.

That last condition has two halves and both matter. `remaining <= leadMs` is what makes the lead time mean something: at the default of thirty minutes, a task due at six o'clock warns you at half past five. `remaining > 0` is what keeps the sweep from shouting about the past. A reminder exists to arrive before a due time, so once a task is overdue the sweep leaves it alone, and opening the app after a week away does not dump a stack of stale banners.

Create `src/hooks/use-reminders.ts`:

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
                if (remaining > 0 && remaining <= leadMs) {
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

The effect sweeps immediately and then every minute, and clears its interval on cleanup. Because `tasks` and `reminderMinutes` are dependencies, editing a due date or changing the lead time in Preferences tears the interval down and starts a fresh one against the new values, so a task you just scheduled is considered on the next tick rather than after a restart.

The already-notified ids live in a ref rather than in state or in the store. A ref survives re-renders without causing one, and this set is deliberately not persisted: it is a record of what this process has already said, and a new process starting is exactly when you want the app to look at everything again.

::: details Why is one minute enough resolution?

The sweep compares against a lead measured in minutes, so checking more often than once a minute cannot change which tasks qualify, only how soon within that minute they are noticed. A reminder that arrives up to sixty seconds into a thirty-minute lead is still a thirty-minute lead. Going the other way, a longer interval would let a task slip from "not due yet" to "already overdue" between two ticks and never be announced at all.

:::

## Sending it

The hook is handed a `sendReminder` function rather than reaching for the application itself, which keeps it a plain function over data you can call from anywhere. The window supplies the real one.

`useApplication()` returns the running `Gtk.Application`, and `sendNotification(id, notification)` is the method on it. The id you pass is the notification's identity as far as the shell is concerned: send a notification with an id that is already on screen and it replaces that one instead of stacking a second copy. Using the task id gives you that for free.

Wire it up in `src/components/window.tsx`:

```tsx
import { quit, useApplication, useBindSetting, useSetting } from "@gtkx/react";
import { useCallback, useEffect, useRef } from "react";
import schema from "#data/com.gtkx.tutorial.gschema.xml";
import { useReminders } from "../hooks/use-reminders.js";
import { buildReminder } from "../notifications.js";
import type { Task } from "../types.js";
// ...

export const Window = () => {
    const application = useApplication();
    const tasks = useStore((state) => state.tasks);
    // ...

    const [colorScheme] = useSetting(schema, "color-scheme");
    const [reminderMinutes] = useSetting(schema, "reminder-minutes");
    // ...

    const sendReminder = useCallback(
        (task: Task) => application.sendNotification(task.id, buildReminder(task)),
        [application],
    );
    useReminders(tasks, reminderMinutes, sendReminder);
    // ...
};
```

`sendReminder` is wrapped in `useCallback` because the hook lists it as a dependency. Without that, every render would hand the effect a new function, tear down the interval, and sweep again, which would be harmless but wasteful. The spin row you built in [Preferences and the System Theme](/tutorial/preferences-and-theming) now has its effect: `reminder-minutes` flows straight from GSettings into the comparison the sweep makes.

## Actions the shell can reach

The notification names `app.complete-task` and `app.open-task`, and neither exists yet. In [Menus, Accelerators, and Shortcuts](/tutorial/actions-menus-shortcuts) you learned that an action's scope prefix comes from where the element is mounted rather than from anything in its name. This is the other half of that rule: mount a `GSimpleAction` in the application's `actions` slot and you get `app.` instead of `win.`.

Both actions take an argument, which a GAction declares as a type rather than inferring. `GLib.VariantType.new("s")` declares a string parameter, matching the string variant `notifications.ts` builds. In the handler the parameter is nullable, so guard it, and `getString()` hands back a value and length pair, so take the first element.

Add the slot in `src/app.tsx`:

```tsx
import * as GLib from "@gtkx/gi/glib";
import { GSimpleAction } from "@gtkx/jsx/gio";
import { useStore } from "./store/index.js";
// ...

export function App() {
    return (
        <AdwApplication
            actionAccels={[
                // ...
            ]}
            actions={
                <>
                    <GSimpleAction
                        name="complete-task"
                        parameterType={GLib.VariantType.new("s")}
                        onActivate={(parameter) => {
                            if (parameter) useStore.getState().setDone(parameter.getString()[0], true);
                        }}
                    />
                    <GSimpleAction
                        name="open-task"
                        parameterType={GLib.VariantType.new("s")}
                        onActivate={(parameter) => {
                            if (!parameter) return;
                            const { select, openTask } = useStore.getState();
                            select({ kind: "smart", view: "all" });
                            openTask(parameter.getString()[0]);
                        }}
                    />
                </>
            }
        >
            <Window />
        </AdwApplication>
    );
}
```

`open-task` selects All Tasks before opening the task, because the task the shell names may well not be in whichever view was showing when you quit, and a detail pane you cannot navigate back out of is worse than no navigation at all.

## Reaching the store from outside React

Look at what those two handlers are not. They take no props, they sit in no component, and there is no window guaranteed to exist when they run. `useStore.getState()` reads and writes the same store the entire interface renders from, and every component watching the fields these handlers touch re-renders the moment they do.

This is the payoff of putting state outside the component tree, and it is worth naming the alternative. Had `tasks` lived in `app.tsx` state and travelled down as props, or in a context provider, these handlers would have had nothing to call: they run above the tree, not inside it. You would have needed a mutable bridge object updated from an effect, kept in step by hand, and correct only once a window had rendered.

Cold start is where that difference stops being theoretical. Click Mark Complete on a notification with the app closed, and the desktop starts your app over D-Bus purely to deliver the action. The store module loads, the `persist` middleware you added in [Saving Tasks Between Runs](/tutorial/saving-to-disk) reads `tasks.json`, the handler flips one task to done, and the same middleware writes the file back, all before any window has been drawn.

## What delivery depends on

Sending a notification is a request to the desktop, and the desktop grants it based on the application's installed identity rather than on anything in the running process. Two keys in the desktop entry decide it, and you write that file in [Appendix B](/tutorial/packaging):

- `DBusActivatable=true` lets the desktop start the application over D-Bus to deliver an action, which is what makes Mark Complete work when nothing is running.
- `X-GNOME-UsesNotifications=true` is what lists Tasks in the desktop's notification settings, where you can silence it.

Both depend on the application ID matching in the entry, in `gtkx.config.ts`, and in the GSettings schema. That is the identity a notification travels under.

## Run it

```sh
npm run dev
```

Open a task, set its due date to today, and pick a time a few minutes ahead of now while leaving the reminder lead at its default of thirty minutes. Within a minute a banner appears carrying the task title, a body reading `Due` followed by the formatted date and time, and a Mark Complete button. Click the banner body instead and the window comes forward with that task open in the editor.

Now the cold-start check. Give a second task a due time a few minutes out, wait for its notification, then quit the app entirely. The notification is still there in the message tray. Click Mark Complete, and the app starts, the task is completed, and `cat ~/.local/share/com.gtkx.tutorial/tasks.json` shows `"done": true` on it.

::: warning No notification appears?

Delivery goes through the `org.freedesktop.Notifications` service. Where none is running, which is common in a bare session or a container, `sendNotification` prints `GLib-GIO-WARNING: unable to send notifications through org.freedesktop.Notifications` on standard error and nothing is shown. The app is behaving correctly and the notification is simply being dropped: check the sweep by adding a `console.log` in `sendReminder`, and check the actions themselves with `gapplication action com.gtkx.tutorial complete-task <task-id>`.

:::

## You built an app

Tasks is finished. It stores what you type, navigates, adapts, edits, filters, searches, sorts, drags, warns, undoes, remembers your preferences, follows the system theme, and answers the keyboard. Everything the core spine claimed:

- **A component is a GTK4 widget.** The name is the GObject type name verbatim and its props are that widget's properties in camelCase, so the GTK4 and Adwaita documentation is your component reference.
- **A container slot is a prop that takes JSX.** Header bars, breakpoints, actions, controllers, and adjustments all attach somewhere other than the child list.
- **A controlled widget is a value prop paired with its own change signal.** That single idiom covers the checkbox, the split view, the search bar, the toggle group, and the switch row.
- **State lives outside the component tree.** Rows call the store directly, derived views are pure functions over stably selected arrays, and an action handler with no component around it reaches the same store.
- **Persistence is configuration, not code.** The `persist` middleware writes user content to the XDG data directory, and GSettings holds the preferences the desktop can also read.
- **Commands are named actions.** A menu item, an accelerator, and a notification button all activate the same action, and scope comes from the mount point.

### Challenges

Take these in order. Each is a real feature and each is smaller than the chapter it builds on.

1. **Show overdue work on the Today row.** `sidebarCounts` counts what is open; add a second count for tasks whose due time has already passed and render it as an `error`-styled badge beside the existing one.
2. **Add a Snooze button to the reminder.** A second `addButtonWithTarget` on the notification targeting a new `app.snooze-task` action that pushes the due time out by ten minutes. Removing the id from the notified set is the part that needs thought, since that set currently lives in a ref inside the hook.
3. **Add multi-select mode.** A selection state in the UI slice, a header bar that swaps for a selection header while it is on, a `GtkActionBar` at the bottom with batch Complete, Move, and Delete, and store actions taking arrays of ids. Build the selection list with `ListView` from `@gtkx/components` rather than a list box: it recycles rows, so a thousand tasks cost as much as a screenful. See [Components and Hooks](/guide/components-and-hooks).
4. **Add subtasks.** A `parentId` on `Task` turns the flat array into a tree, which touches the model, every selector, the row, and the drag reorder. This is the architectural one, and finishing it means you can change this app's shape rather than only extend it.

## Next

[Appendix A: Testing the App](/tutorial/testing)
