---
description: "Undo toasts pushed through an AdwToastOverlay ref, plus the confirmation, New List, and About dialogs mounted as components."
---

# Feedback and Dialogs

This chapter covers the undo toast shown after a delete, the confirmation dialog guarding permanent deletion, the New List form, and the About dialog.

## Undo toasts

Toasts are pushed imperatively through a ref, while dialogs are mounted declaratively as components. The `AdwToastOverlay` that receives them wraps the split view in `app.tsx`, so a toast can appear over any pane:

```tsx
const toastOverlayRef = useRef<Adw.ToastOverlay | null>(null);

// ...

<AdwToastOverlay ref={toastOverlayRef}>
    <AdwNavigationSplitView
        collapsed={collapsed}
        showContent={showContent}
        onNotifyShowContent={(value) => setShowContent(value ?? false)}
        sidebar={/* ... */}
        content={/* ... */}
    />
</AdwToastOverlay>
```

The single-task delete handler builds a toast, gives it an Undo button, and hands it to the overlay:

```tsx
const handleDelete = (task: Task): void => {
    if (task.deleted) {
        setTaskToDelete(task);
        return;
    }
    api.moveToTrash(task.id);
    if (selectedTaskId === task.id) setSelectedTaskId(null);
    const toast = Adw.Toast.new(`“${task.title}” moved to Trash`);
    toast.buttonLabel = "Undo";
    toast.once("button-clicked", () => api.restore(task.id));
    toastOverlayRef.current?.addToast(toast);
};
```

`once` fires the restore callback a single time, matching the toast's single Undo click. Clearing `selectedTaskId` when the trashed task is the open one sends the content pane back to the task list.

## Dialogs

### Confirming the irreversible

A task already in Trash has nothing left to soft-delete, so `handleDelete` sets `taskToDelete` instead of showing a toast, and that state mounts `delete-confirmation.tsx`:

```tsx
import * as Adw from "@gtkx/gi/adw";
import { AdwAlertDialog } from "@gtkx/jsx/adw";

export const DeleteConfirmation = ({
    taskTitle,
    onConfirm,
    onCancel,
}: {
    taskTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
}) => {
    return (
        <AdwAlertDialog
            heading="Delete Task?"
            body={`“${taskTitle}” will be permanently deleted. This cannot be undone.`}
            defaultResponse="cancel"
            closeResponse="cancel"
            responses={[
                { id: "cancel", label: "Cancel" },
                { id: "delete", label: "Delete", appearance: Adw.ResponseAppearance.DESTRUCTIVE },
            ]}
            onResponse={(id) => {
                if (id === "delete") onConfirm();
                else onCancel();
            }}
        />
    );
};
```

`responses` declares the buttons as `{ id, label, appearance }` entries, and the chosen `id` comes back on `onResponse`. `defaultResponse` and `closeResponse` bind Return and Escape to Cancel, so neither key can delete.

### The New List dialog: a form in an alert dialog

An alert dialog's children become its body, so `new-list-dialog.tsx` puts an entry and a row of color swatches inside the same `AdwAlertDialog`:

```tsx
const PALETTE = ["#3584e4", "#2ec27e", "#e66100", "#9141ac", "#e01b24", "#f5c211"];

export const NewListDialog = ({
    onAdd,
    onCancel,
}: {
    onAdd: (name: string, color: string) => void;
    onCancel: () => void;
}) => {
    const [name, setName] = useState("");
    const [color, setColor] = useState(PALETTE[0]);

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
                if (id === "add") onAdd(name, color);
                else onCancel();
            }}
        >
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={16} marginTop={8}>
                <GtkEntry placeholderText="List name" activatesDefault onChanged={(self) => setName(self.text)} />
                <GtkBox spacing={6} halign={Gtk.Align.CENTER}>
                    {/* ... one GtkToggleButton per PALETTE swatch, active={color === swatch} ... */}
                </GtkBox>
            </GtkBox>
        </AdwAlertDialog>
    );
};
```

The form is ordinary controlled React, and `activatesDefault` on the entry makes Return trigger the default response, which `defaultResponse="add"` points at Add.

### The About dialog

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

`applicationIcon` is an icon name that happens to match the application ID, resolved from the icons installed in [Packaging and Shipping](/tutorial/packaging).

### How a dialog gets on screen

The dialogs are mounted conditionally at the bottom of the window:

```tsx
{/* ... */}
{showAbout ? <About onClose={() => setShowAbout(false)} /> : null}
{/* ... */}
{showNewList ? (
    <NewListDialog
        onAdd={(name, color) => {
            api.addList(name, color);
            setShowNewList(false);
        }}
        onCancel={() => setShowNewList(false)}
    />
) : null}
{taskToDelete ? (
    <DeleteConfirmation
        taskTitle={taskToDelete.title}
        onConfirm={confirmDelete}
        onCancel={() => setTaskToDelete(null)}
    />
) : null}
```

Mounting the component presents the dialog and unmounting it closes the dialog, which is the contract every Adwaita dialog component in `@gtkx/jsx/adw` implements.

The widget is rendered through a portal to the root element rather than into the surrounding widget tree, so it stays top-level until it is presented on the enclosing `AdwApplicationWindow`. `onClosed` runs when the dialog closes (Escape, the close button, a swipe), which is where you clear the state that mounted it.

## Next

Continue to [Testing the App](/tutorial/testing).
