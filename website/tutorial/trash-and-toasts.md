---
description: "Make deletion recoverable with an Undo toast, a confirmation dialog, and a Trash you can empty."
---

# Deleting Without Fear

Your app has commands now: a menu, accelerators, and a shortcut controller, all built in [Menus, Accelerators, and Shortcuts](/tutorial/actions-menus-shortcuts). One of those commands is Delete, and right now it is the rudest thing in the app. Click the trash button on a row and the task vanishes. No warning, no way back, no acknowledgement that anything happened at all.

That is the one behavior a task app cannot have. In this chapter you make deletion recoverable: a task moves to Trash with a toast offering Undo, and deleting it a second time asks first. Along the way you build the dialog that finally lets the reader create a list.

## Two shapes of feedback

GNOME apps give you feedback in two shapes, and the difference decides how you write each one.

A toast is an event. It happens, it is already true, and it slides away on its own. You push a toast at the moment it occurs, so it is imperative: you call a function.

A dialog is a state. The app is waiting on you, and it stays waiting until you answer. So a dialog is declarative: something in your store says a dialog is showing, and mounting the component presents it, exactly as [chapter eleven](/tutorial/actions-menus-shortcuts) set up for the About and Shortcuts dialogs.

Deleting uses both. Soft-deleting is a toast. Permanent deletion is a dialog.

## The undo toast

Adwaita puts toasts in an `AdwToastOverlay`, which wraps the widgets that toasts appear over. Your window already has an obvious thing to wrap: the whole split view.

The awkward part is raising one. The code that deletes a task lives far from the overlay, and threading a callback down through the sidebar, the content pane, and every row is exactly the prop-drilling the store exists to avoid. So keep a module-level reference to the overlay and export a function that anyone can call.

Create `src/components/toast-overlay.tsx`:

```tsx
import * as Adw from "@gtkx/gi/adw";
import { AdwToastOverlay } from "@gtkx/jsx/adw";
import type { ReactNode } from "react";

let mounted: Adw.ToastOverlay | null = null;

export const showToast = (title: string, onUndo: () => void): void => {
    if (mounted === null) return;
    const toast = Adw.Toast.new(title);
    toast.buttonLabel = "Undo";
    toast.once("button-clicked", onUndo);
    mounted.addToast(toast);
};

export const ToastOverlay = ({ children }: { children: ReactNode }) => (
    <AdwToastOverlay
        ref={(overlay) => {
            mounted = overlay;
            return () => {
                mounted = null;
            };
        }}
    >
        {children}
    </AdwToastOverlay>
);
```

Every GTKX element accepts a `ref`, and the value you get is the widget itself: here an `Adw.ToastOverlay`, with every method the Adwaita documentation lists on it. A ref callback that returns a function has that function called on unmount, so `mounted` is set while the overlay is on screen and cleared the moment it leaves. That is why the type is nullable and why `showToast` checks it.

`Adw.Toast.new` builds the toast, `buttonLabel` gives it its action button, and `addToast` hands it to the overlay to queue and display. The handler goes on with `once` rather than `on`, because a toast's button can only be clicked once before the toast goes away, and `once` disconnects itself after the first emission.

::: warning
Symptom: you delete a task, it disappears, and no toast ever appears. `showToast` returns early whenever `mounted` is null, which is the case before the overlay renders and after the window closes. If toasts are silently doing nothing, check that `ToastOverlay` is actually mounted around your content and that no other component has claimed the same module.
:::

Wrap the split view with it. In `src/components/window.tsx`:

```tsx
import { ToastOverlay } from "./toast-overlay.js";

// ...

<AdwApplicationWindow
    title="Tasks"
    // ...
>
    <ToastOverlay>
        <AdwNavigationSplitView
            // ...
        />
    </ToastOverlay>
    <Dialogs />
</AdwApplicationWindow>
```

## Restoring

A toast that offers Undo needs something to undo to. `moveToTrash` from [chapter five](/tutorial/completing-and-deleting) only flips the `deleted` flag, so the task is still in the array, still in the file on disk, and already showing up in the Trash view you added in [chapter nine](/tutorial/smart-views-and-search). Give the slice the two moves that flag implies: put it back, or drop it for good.

In `src/store/tasks.ts`, add to the slice type and to the creator:

```diff
     moveToTrash: (id: string) => void;
+    restore: (id: string) => void;
+    deleteForever: (id: string) => void;
```

```diff
     moveToTrash: (id) => set((state) => ({ tasks: patch(state.tasks, id, { deleted: true }) })),
+    restore: (id) => set((state) => ({ tasks: patch(state.tasks, id, { deleted: false }) })),
+    deleteForever: (id) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
```

`restore` is `moveToTrash` with the flag flipped back, and it is the only thing the Undo button has to call. `deleteForever` is the only place in the app that removes a task from the array, which is what makes it worth a confirmation.

Notice what `showToast` will do with `restore`. The Undo callback is not inside a component, has no hooks available, and never re-renders. It does not need to. Your store is not React state: it is a plain object with a `getState` method, and any module can read it or call an action on it. That rule holds for the rest of the tutorial, and [Reminders That Reach the Desktop](/tutorial/reminders) leans on it again from a background sweep.

## Confirming a permanent delete

A task sitting in Trash has nothing left to soft-delete. Pressing its trash button means permanent, so this is the case that gets a dialog.

The store needs to know which task is being asked about. In `src/store/ui.ts`, add the field and its action:

```diff
     dialog: DialogKind;
+    taskToDelete: string | null;
```

```diff
     showDialog: (dialog: DialogKind) => void;
+    askDeleteTask: (taskToDelete: string | null) => void;
```

```diff
     dialog: "none",
+    taskToDelete: null,
```

```diff
     showDialog: (dialog) => set({ dialog }),
+    askDeleteTask: (taskToDelete) => set({ taskToDelete, dialog: taskToDelete === null ? "none" : "delete-task" }),
```

`askDeleteTask` sets both fields at once, so there is no state where a delete dialog is showing without a task behind it. Passing `null` is how you dismiss it.

Add the new kind to `src/types.ts`:

```diff
-export type DialogKind = "none" | "about" | "shortcuts" | "new-list";
+export type DialogKind = "none" | "about" | "shortcuts" | "new-list" | "delete-task";
```

Now the dialog. Create `src/components/delete-confirmation.tsx`:

```tsx
import * as Adw from "@gtkx/gi/adw";
import { AdwAlertDialog } from "@gtkx/jsx/adw";
import { useStore } from "../store/index.js";

export const DeleteConfirmation = () => {
    const taskToDelete = useStore((state) => state.taskToDelete);
    const tasks = useStore((state) => state.tasks);
    const deleteForever = useStore((state) => state.deleteForever);
    const askDeleteTask = useStore((state) => state.askDeleteTask);
    const title = tasks.find((task) => task.id === taskToDelete)?.title ?? "";

    return (
        <AdwAlertDialog
            heading="Delete Task?"
            body={`“${title}” will be permanently deleted. This cannot be undone.`}
            defaultResponse="cancel"
            closeResponse="cancel"
            responses={[
                { id: "cancel", label: "Cancel" },
                { id: "delete", label: "Delete", appearance: Adw.ResponseAppearance.DESTRUCTIVE },
            ]}
            onResponse={(id) => {
                if (id === "delete" && taskToDelete !== null) deleteForever(taskToDelete);
                askDeleteTask(null);
            }}
        />
    );
};
```

`AdwAlertDialog` declares its buttons as data. Each entry in `responses` carries an `id`, the `label` the user reads, and an optional `appearance`. The id is what comes back to `onResponse`, so the handler is a single branch on a string rather than a callback per button. `Adw.ResponseAppearance.DESTRUCTIVE` is what paints the Delete button red, and it is the standard signal across GNOME that a button does something you cannot take back.

`defaultResponse` and `closeResponse` are the keyboard's two answers: Return picks the default, Escape and the window manager's close both pick the close response. Both point at `cancel` here, deliberately. Nothing in this dialog can destroy a task by reflex.

::: warning
Symptom: tapping Escape or hitting Return out of habit deletes the task. That happens when `defaultResponse` or `closeResponse` names the destructive id. On a destructive dialog, point both of them at the safe response, always.
:::

`onResponse` fires for every answer including the close response, so clearing `taskToDelete` unconditionally at the end covers cancel, Escape, and delete alike.

Mount it from `src/components/dialogs.tsx`:

```diff
+        case "delete-task":
+            return <DeleteConfirmation />;
         case "none":
             return null;
```

## One place that decides

Three parts of the app can delete a task: the trash button on a row, the trash button in the open task's header, and the Delete key. All three need the same branch, and none of them should carry it. `dialogs.tsx` already owns which dialog is showing, so give it the decision too.

Add to `src/components/dialogs.tsx`:

```tsx
import type { Task } from "../types.js";
import { showToast } from "./toast-overlay.js";

// ...

export const requestDeleteTask = (task: Task): void => {
    const { moveToTrash, restore, askDeleteTask, selectedTaskId, closeTask } = useStore.getState();
    if (task.deleted) {
        askDeleteTask(task.id);
        return;
    }
    moveToTrash(task.id);
    if (selectedTaskId === task.id) closeTask();
    showToast(`“${task.title}” moved to Trash`, () => restore(task.id));
};
```

This is the rule from earlier in action. `requestDeleteTask` is not a component and not a hook. It calls `useStore.getState()`, destructures what it needs at the instant it runs, and gets values that are current by construction, because there is no render to be stale relative to. A task already in Trash raises the dialog. Anything else moves to Trash, closes the editor if that task was open, and raises a toast whose Undo calls `restore`.

Point the three call sites at it. In `src/components/task-row.tsx`:

```diff
-                        onClicked={() => moveToTrash(task.id)}
+                        onClicked={() => requestDeleteTask(task)}
```

In `src/components/content-pane.tsx`, on the trash button in the open task's header:

```diff
-                                    onClicked={() => moveToTrash(task.id)}
+                                    onClicked={() => requestDeleteTask(task)}
```

And in `src/components/app-shortcuts.tsx`, where the Delete key lands:

```tsx
const deleteSelected = (): void => {
    const { tasks, selectedTaskId: id } = useStore.getState();
    const task = tasks.find((candidate) => candidate.id === id);
    if (task) requestDeleteTask(task);
};
```

Each site imports `requestDeleteTask` from `./dialogs.js` and drops its own `moveToTrash` selection. The button now says what the user asked for, not what the app should do about it.

## A dialog that is a form

You have had lists in the sidebar since [chapter seven](/tutorial/lists-and-the-sidebar), seeded and unchangeable. Creating one needs a name and a color, which is a form, and an alert dialog can be one: its children are its body, laid out above the response buttons.

Create `src/components/new-list-dialog.tsx`:

```tsx
import * as Adw from "@gtkx/gi/adw";
import * as Gtk from "@gtkx/gi/gtk";
import { AdwAlertDialog } from "@gtkx/jsx/adw";
import { GtkBox, GtkEntry, GtkToggleButton } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { useStore } from "../store/index.js";
import { listDot } from "../styles.js";

const PALETTE = ["#3584e4", "#2ec27e", "#e66100", "#9141ac", "#e01b24", "#f5c211"];

export const NewListDialog = () => {
    const addList = useStore((state) => state.addList);
    const showDialog = useStore((state) => state.showDialog);
    const [name, setName] = useState("");
    const [color, setColor] = useState("#3584e4");

    return (
        <AdwAlertDialog
            heading="New List"
            defaultResponse="add"
            closeResponse="cancel"
            responses={[
                { id: "cancel", label: "Cancel" },
                { id: "add", label: "Add", appearance: Adw.ResponseAppearance.SUGGESTED },
            ]}
            onResponse={(id) => {
                if (id === "add") addList(name, color);
                showDialog("none");
            }}
        >
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={16} marginTop={8}>
                <GtkEntry placeholderText="List name" activatesDefault onChanged={(self) => setName(self.text)} />
                <GtkBox spacing={6} halign={Gtk.Align.CENTER}>
                    {PALETTE.map((swatch) => (
                        <GtkToggleButton
                            key={swatch}
                            active={color === swatch}
                            cssClasses={["flat"]}
                            accessibleLabel={`Color ${swatch}`}
                            onClicked={() => setColor(swatch)}
                        >
                            <GtkBox
                                widthRequest={22}
                                heightRequest={22}
                                cssClasses={[listDot(swatch)]}
                                accessibleRole={Gtk.AccessibleRole.PRESENTATION}
                            />
                        </GtkToggleButton>
                    ))}
                </GtkBox>
            </GtkBox>
        </AdwAlertDialog>
    );
};
```

Here `defaultResponse` is `add`, because the safe answer and the expected answer are the same thing: a name and a color make a list, and nothing is destroyed. `SUGGESTED` is the counterpart to `DESTRUCTIVE`, painting Add as the accent-colored button the dialog is steering you toward.

`activatesDefault` on the entry connects the two: pressing Return in the text field activates the dialog's default response, so you can type a name and hit Return without reaching for the mouse.

The name and the chosen color are transient form state that disappears when the dialog closes, so they live in `useState` rather than in the store. Only the finished list, handed to `addList`, is worth keeping.

Each swatch is a `GtkToggleButton` whose `active` is a comparison against the current color, which makes the row behave like a radio group without one of them: exactly one comparison is true at a time. Inside each button is a box sized to a dot and styled with `listDot`, the same helper `src/styles.ts` gives the sidebar, so a color reads identically in the picker and in the list it names. A dot carries no text, so the button gets an `accessibleLabel` and the dot itself is marked `PRESENTATION` to keep it out of the accessibility tree.

Mount it alongside the other dialogs in `src/components/dialogs.tsx`:

```diff
+        case "new-list":
+            return <NewListDialog />;
         case "delete-task":
             return <DeleteConfirmation />;
```

And give the sidebar's header bar a button to raise it. In `src/components/window.tsx`:

```tsx
const showDialog = useStore((state) => state.showDialog);

// ...

<AdwToolbarView
    topBar={
        <AdwHeaderBar
            start={
                <GtkButton
                    iconName="list-add-symbolic"
                    tooltipText="New List"
                    onClicked={() => showDialog("new-list")}
                />
            }
        />
    }
>
    <Sidebar />
</AdwToolbarView>
```

## Run it

```sh
npm run dev
```

Delete a task from any list: the row leaves immediately and a toast slides up saying it moved to Trash. Click **Undo** and the exact task returns to its list, still with its notes, its star, and its due date. Let a second toast expire on its own and the task stays in Trash, where the sidebar's Trash count has gone up by one.

Select **Trash** in the sidebar and press the trash button on a row there. This time a dialog appears naming the task and offering Cancel and a red Delete. Press **Escape**: the dialog closes and the task is still in Trash, unchanged. Press Delete this time and it is gone from the list, from Trash, and from `tasks.json` after the next write.

Click the **+** button in the sidebar header. Type a name, click one of the color swatches, and press Return. The dialog closes and the new list appears in the sidebar under Important, with a dot in the color you picked. Select it and add a task, then restart the app: the list and its task are both still there.

## Summary

- **Toasts are events and dialogs are states.** A toast is pushed imperatively at the moment something happens; a dialog is mounted because your store says it is showing.
- **A widget ref hands you the real GTK4 object**, and a ref callback returning a cleanup keeps a module-level reference honest, so `showToast` can raise a toast from anywhere without a prop or a context.
- **The store is reachable from outside React.** `useStore.getState()` reads current values in a plain function, which is what lets a toast's Undo button and a keyboard handler call the same store actions a component would.
- **An alert dialog declares its buttons as data.** `responses` carries the ids and labels, `onResponse` branches on the id that came back, and `appearance` marks one `DESTRUCTIVE` or `SUGGESTED`.
- **`defaultResponse` and `closeResponse` are the keyboard's answers**, and on a destructive dialog both point at the safe one.
- **An alert dialog's children are its body**, which is enough to make it a small form when a command needs input before it runs.

## Next

Continue to [Preferences and the System Theme](/tutorial/preferences-and-theming), where the app gains settings that outlive the window and follows the desktop's light or dark scheme.
