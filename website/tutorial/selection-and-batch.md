---
description: "Implement GNOME's selection mode pattern, with a transformed header bar, a bottom action bar, and batch actions."
---

# Selection Mode

Selection mode lets the user act on several tasks at once, and it lives in `app.tsx` plus `components/selection-view.tsx`.

## Entering and leaving selection mode

```tsx
const [selecting, setSelecting] = useState(false);
const [selectedIds, setSelectedIds] = useState<string[]>([]);
```

```tsx
const enterSelection = (): void => {
    setSelectedTaskId(null);
    setSelectedIds([]);
    setSelecting(true);
};
const cancelSelection = (): void => {
    setSelecting(false);
    setSelectedIds([]);
};
```

Clearing `selectedTaskId` on the way in sends the content pane back to the list, so selection mode always starts on the tasks it applies to.

The main menu's "Select Tasks" item and the [Escape shortcut](/tutorial/actions-menus-shortcuts#view-shortcuts-gtkshortcutcontroller-for-ephemeral-keys) reach these through the window's [`select` action](/tutorial/actions-menus-shortcuts) and `onEscape`.

## The header bar and action bar

Selection mode swaps the whole header bar. The content pane wraps the list in an `AdwToolbarView`, and `selecting` picks which header bar goes in its `topBar`:

```tsx
<AdwToolbarView topBar={selecting ? selectionHeader : listHeader} bottomBar={selectionActionBar} revealBottomBars={selecting}>
    {listBody}
</AdwToolbarView>
```

```tsx
const selectionHeader = (
    <AdwHeaderBar
        showStartTitleButtons={false}
        showEndTitleButtons={false}
        titleWidget={<AdwWindowTitle title={`${selectedIds.length} selected`} />}
        start={<GtkButton label="Cancel" onClicked={cancelSelection} />}
        end={<GtkButton label="Select All" onClicked={() => setSelectedIds(visible.map((task) => task.id))} />}
    />
);
```

```tsx
const selectionActionBar = (
    <GtkActionBar
        revealed={selecting}
        start={
            <GtkButton
                label="Complete"
                cssClasses={["suggested-action"]}
                sensitive={selectedIds.length > 0}
                onClicked={completeSelected}
            />
        }
        end={
            <>
                <GtkMenuButton
                    label="Move"
                    sensitive={selectedIds.length > 0}
                    popover={<GtkPopover>{/* one flat GtkButton per list, calling moveSelected(list.id) */}</GtkPopover>}
                />
                <GtkButton
                    label="Delete"
                    cssClasses={["destructive-action"]}
                    sensitive={selectedIds.length > 0}
                    onClicked={deleteSelected}
                />
            </>
        }
    />
);
```

Select All maps over `visible`, the same filtered array the list is showing, so it respects the active filter. Every button is gated on `selectedIds.length > 0`.

## The selectable list

```tsx
const listBody = selecting ? (
    <SelectionView tasks={visible} selectedIds={selectedIds} onSelectionChanged={setSelectedIds} />
) : (
    <TaskList /* ... */ />
);
```

```tsx
import { ListView } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkImage, GtkLabel, GtkScrolledWindow } from "@gtkx/jsx/gtk";
import { formatDue } from "../format.js";
import type { Task } from "../types.js";

export const SelectionView = ({
    tasks,
    selectedIds,
    onSelectionChanged,
}: {
    tasks: Task[];
    selectedIds: string[];
    onSelectionChanged: (ids: string[]) => void;
}) => (
    <GtkScrolledWindow vexpand>
        <ListView<Task>
            items={tasks.map((task) => ({ id: task.id, value: task }))}
            selectionMode={Gtk.SelectionMode.MULTIPLE}
            selectedIds={selectedIds}
            onSelectionChanged={onSelectionChanged}
            estimatedItemHeight={56}
            renderItem={({ item }) => (
                <GtkBox /* title, dimmed due caption, star icon when important */ />
            )}
        />
    </GtkScrolledWindow>
);
```

`ListView` recycles a pool of row widgets as you scroll, where [TaskList](/tutorial/the-task-list#the-outer-frame)'s boxed list materializes one widget per task. Selection is controlled: `selectedIds` goes down and `onSelectionChanged` feeds `setSelectedIds`.

## Batch actions and the shared undo flow

```tsx
const completeSelected = (): void => {
    api.completeMany(selectedIds);
    cancelSelection();
};
const moveSelected = (listId: string): void => {
    api.moveToList(selectedIds, listId);
    cancelSelection();
};
```

```tsx
const deleteSelected = (): void => {
    const ids = [...selectedIds];
    api.trashMany(ids);
    const toast = Adw.Toast.new(`${ids.length} task${ids.length === 1 ? "" : "s"} moved to Trash`);
    toast.buttonLabel = "Undo";
    toast.once("button-clicked", () => {
        for (const id of ids) api.restore(id);
    });
    toastOverlayRef.current?.addToast(toast);
    cancelSelection();
};
```

Batch delete pushes onto the same `toastOverlayRef` overlay as single-item delete, so both share one recovery path ([Feedback and Dialogs](/tutorial/feedback-and-dialogs)). The [`api.` mutations](/tutorial/data-and-persistence#the-hook-state-plus-every-mutation) live in the tasks hook.

## Next

Continue to [Preferences and Theming](/tutorial/preferences-and-theming).
