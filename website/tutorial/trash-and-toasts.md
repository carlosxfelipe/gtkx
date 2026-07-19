---
description: "Make deletion recoverable with an Undo toast, a confirmation dialog, and a Trash you can empty."
---

# Deleting Without Fear

Delete is one of the commands you wired up in [Menus, Accelerators, and Shortcuts](/tutorial/actions-menus-shortcuts). Right now clicking the trash button on a row removes the task with no warning and no way back.

Here you make deletion recoverable. A task moves to Trash with a toast offering Undo, and deleting it again asks first. Along the way you build the dialog for creating a list.

## Toasts and dialogs

A toast is an event: it reports something that already happened, then slides away on its own. You push one imperatively, by calling a function.

A dialog is a state. The app waits until you answer, so it is declarative: a field in your store says a dialog is showing, and mounting the component presents it, as [Menus, Accelerators, and Shortcuts](/tutorial/actions-menus-shortcuts) set up for the About and Shortcuts dialogs.

Soft-deleting is a toast. Permanent deletion is a dialog.

## The undo toast

Adwaita shows toasts through an `AdwToastOverlay`, which wraps the widgets they appear over: in your window, the whole split view.

The code that deletes a task lives far from the overlay. Threading a callback down through the sidebar, the content pane, and every row is the prop-drilling the store exists to avoid. Keep a module-level reference to the overlay instead, and export a function anyone can call.

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

Every GTKX element accepts a `ref`, and the value you get is the widget itself: an `Adw.ToastOverlay`, with every method the Adwaita documentation lists. A ref callback that returns a function has that function run on unmount, so `mounted` holds the overlay while it is on screen and is cleared when it leaves. That is why the type is nullable and `showToast` checks it.

`Adw.Toast.new` builds the toast, `buttonLabel` gives it an action button, and `addToast` hands it to the overlay to queue and display. The handler uses `once` rather than `on`: the button can be clicked only once before the toast goes away, and `once` disconnects itself after the first emission.

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

`moveToTrash` from [Completing, Starring, and Deleting](/tutorial/completing-and-deleting) only flips the `deleted` flag, so the task is still in the array, still in the file on disk, and already showing in the Trash view you added in [Smart Views, Filters, and Search](/tutorial/smart-views-and-search). Add the two moves that flag implies: put the task back, or remove it for good.

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

`restore` is all the Undo button calls. `deleteForever` is the only place in the app that removes a task from the array, which is why it is worth a confirmation.

The Undo callback is not inside a component, so it has no hooks and never re-renders. It does not need them: your store is a plain object with a `getState` method, and any module can read it or call an action on it. [Reminders That Reach the Desktop](/tutorial/reminders) uses that again from a background sweep.

## Confirming a permanent delete

A task already in Trash has nothing left to soft-delete. Pressing its trash button means permanent deletion, so this case gets a dialog.

The store needs to know which task the dialog is asking about. In `src/store/ui.ts`, add the field and its action:

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

`askDeleteTask` sets both fields at once, so a delete dialog is never showing without a task behind it. Passing `null` dismisses it.

Add both new kinds to `src/types.ts`. `delete-task` is the confirmation you build next, and `new-list` is the form dialog later on this page:

```diff
-export type DialogKind = "none" | "about" | "shortcuts";
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

`AdwAlertDialog` declares its buttons as data. The `id` of each entry in `responses` comes back to `onResponse`, so the handler is one branch on a string rather than a callback per button. `Adw.ResponseAppearance.DESTRUCTIVE` paints Delete red, the standard GNOME signal for an action you cannot take back.

`defaultResponse` and `closeResponse` are the keyboard's answers: Return picks the default, while Escape and the window manager's close button pick the close response. On a destructive dialog both should point at the safe response, and both point at `cancel` here, so neither key deletes the task.

`onResponse` fires for every answer, including the close response, so clearing `taskToDelete` at the end covers cancel, Escape, and delete alike.

Mount it from `src/components/dialogs.tsx`:

```diff
+        case "delete-task":
+            return <DeleteConfirmation />;
         case "none":
             return null;
```

## One place that decides

The trash button on a row, the trash button in the open task's header, and the Delete key all need the same branch, and none of them should carry it. `dialogs.tsx` already owns which dialog is showing, so give it this decision too.

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

`requestDeleteTask` is neither a component nor a hook. It calls `useStore.getState()` and reads what it needs at the moment it runs, so the values are always current.

A task already in Trash raises the dialog. Anything else moves to Trash, closes the editor if that task was open, and shows a toast whose Undo calls `restore`.

Point the call sites at it. In `src/components/task-row.tsx`:

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

Each site imports `requestDeleteTask` from `./dialogs.js` and drops its own `moveToTrash` selection, so each button just reports what the user asked for and leaves the decision to `requestDeleteTask`.

## A dialog that is a form

Lists have been in the sidebar since [Lists and a Sidebar](/tutorial/lists-and-the-sidebar), seeded and fixed. Creating one needs a name and a color, and an alert dialog can carry that form: its children become its body, laid out above the response buttons.

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

Here `defaultResponse` is `add`: nothing is destroyed, so the safe answer and the expected answer are the same. `SUGGESTED` is the counterpart to `DESTRUCTIVE`, painting Add as the accent-colored button the dialog steers you toward.

`activatesDefault` on the entry makes Return in the text field trigger the default response, so you can type a name and press Return without reaching for the mouse.

The name and chosen color are transient form state that disappears when the dialog closes, so they live in `useState` rather than the store. Only the finished list, handed to `addList`, needs to persist.

Each swatch is a `GtkToggleButton` whose `active` compares against the current color, so the row behaves like a radio group without being one: exactly one comparison is true at a time. A toggle button flips its own `active` off when you click the swatch that is already selected, and because `color === swatch` stays true React never re-renders to correct it, so set it back in the handler: `onClicked={(self) => { self.active = true; setColor(swatch); }}`. The dot inside uses `listDot` from `src/styles.ts`, the same helper the sidebar uses, so a color reads identically in the picker and in the list it names. A dot carries no text, so the button gets an `accessibleLabel` and the dot is marked `PRESENTATION` to keep it out of the accessibility tree.

Mount it alongside the other dialogs in `src/components/dialogs.tsx`:

```diff
+        case "new-list":
+            return <NewListDialog />;
         case "delete-task":
             return <DeleteConfirmation />;
```

Give the sidebar's header bar a button to raise it. In `src/components/window.tsx`:

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

Save your files and go back to the window.

Delete a task from any list: the row leaves immediately and a toast slides up saying it moved to Trash. Click **Undo** and the task returns to its list with its notes, star, and due date intact. Let a second toast expire on its own and the task stays in Trash, and the sidebar's Trash count goes up.

Select **Trash** in the sidebar and press the trash button on a row there. A dialog appears naming the task and offering Cancel and a red Delete. Press **Escape** and the dialog closes with the task still in Trash. Press Delete instead and it is gone from the list, from Trash, and from `tasks.json` after the next write.

Click the **+** button in the sidebar header. Type a name, click a color swatch, and press Return. The dialog closes and the new list appears in the sidebar under Important, with a dot in the color you picked. Select it and add a task. A list you created goes to disk through the same `persist` path the seed does, and you can read it back without leaving the session:

```bash
jq '.state.lists[-1]' ~/.local/share/com.gtkx.tutorial/tasks.json
```

The name and the color you picked are both there.

## Next

Continue to [Preferences and the System Theme](/tutorial/preferences-and-theming), where the app gains settings that outlive the window and follows the desktop's light or dark scheme.
