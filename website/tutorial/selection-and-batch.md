---
description: "Implement GNOME's selection mode pattern, with a transformed header bar, a bottom action bar, and batch actions driven by one boolean of React state."
---

# Selection Mode

Some actions only make sense in bulk: complete ten tasks at once, move a handful to another list, sweep several into the Trash. GNOME's Human Interface Guidelines have a dedicated *selection mode* for this. It drives three parts of the UI: a selection header that replaces the titlebar, a bottom action bar that carries the batch actions, and one `selecting` boolean of React state behind both.

The HIG reserves selection mode for large collections where at least three actions can be taken on the selected items, which is why Tasks ships Complete, Move, and Delete rather than only Complete and Delete. See [Selection & Edit Modes](https://developer.gnome.org/hig/patterns/containers/selection-mode.html).

The `AdwToolbarView` that frames the task list stays mounted throughout: it swaps its top bar, mounts a bottom bar, and switches its body from `TaskList` to `SelectionView`. This page follows the `selecting` flag from the action that sets it, through the header and action bar it drives, down to the recycled list it renders.

## Entering via the `win.select` action

Selection mode is toggled on by the window's `select` action, one of the five `<GSimpleAction>` elements `app.tsx` mounts in the `AdwApplicationWindow`'s `actions` slot. That slot is what makes its fully qualified name `win.select`. [Actions, Menus, and Shortcuts](/tutorial/actions-menus-shortcuts) covers that scoping. The main menu's "Select Tasks" item activates it, and it runs whatever `onSelect` points at. Two pieces of state back the whole feature:

```tsx
const [selecting, setSelecting] = useState(false);
const [selectedIds, setSelectedIds] = useState<string[]>([]);
```

`onSelect` is wired to `enterSelection`, and there is a matching `cancelSelection`:

```tsx
const enterSelection = (): void => {
    showList();
    setSelectedIds([]);
    setSelecting(true);
};
const cancelSelection = (): void => {
    setSelecting(false);
    setSelectedIds([]);
};
```

Entering starts with `showList()`, which navigates the content stack back to the `List` screen and pops any open task editor, so the content pane is free to show the selectable list. `setSelectedIds([])` then starts selection mode from an empty selection. The Escape key also cancels: the app's global `GtkShortcutController` enables its `Escape` shortcut while `selecting`, and its handler calls `cancelSelection()`.

## Swapping the header bar

The list page's toolbar view picks its top bar from two candidates: selection mode wins, otherwise the normal list header shows:

```tsx
topBar={selecting ? selectionHeader : listHeader}
```

The task editor's header never enters this choice. As [The Application Shell](/tutorial/app-shell) and [The Task Editor](/tutorial/the-task-editor) established, the editor's header belongs to the separate `Task` screen that is pushed on top of the list, so selection mode only competes with the list header.

The `selectionHeader` is a plain `AdwHeaderBar`, but configured to stop looking like the normal chrome:

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

Three things to notice, all GTK4/Adwaita specifics rather than React:

- `showStartTitleButtons={false}` and `showEndTitleButtons={false}` hide the window's own controls (close, minimize) so the header reads as a modal selection surface, not the normal titlebar. Cancel (or the Escape key) exits.
- `titleWidget` takes a full widget instead of a plain string. An `AdwWindowTitle` renders the HIG-mandated count, `"3 selected"`, and re-renders automatically because `selectedIds.length` is React state.
- `Select All` writes every currently visible id into `selectedIds`. It uses `visible`, the same filtered/searched/sorted array the list is showing, so "select all" respects the active filter rather than grabbing every task in the store.

## The bottom action bar (`revealBottomBars`)

The batch actions live in a `GtkActionBar`. This is a GTK4 widget (there is no `AdwActionBar`) with `start` and `end` slots and a `revealed` prop that animates it in and out:

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
                    popover={
                        <GtkPopover>
                            <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                                {lists.map((list) => (
                                    <GtkButton
                                        key={list.id}
                                        label={list.name}
                                        cssClasses={["flat"]}
                                        onClicked={() => moveSelected(list.id)}
                                    />
                                ))}
                            </GtkBox>
                        </GtkPopover>
                    }
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

The two style classes are the standard GTK4 accent roles: `suggested-action` paints Complete in the accent color (the primary batch action), and `destructive-action` paints Delete red. Every button is gated with `sensitive={selectedIds.length > 0}`, so with nothing selected the bar is visible but inert. Move is a `GtkMenuButton`: its `popover` prop takes a `GtkPopover` whose body is a vertical `GtkBox` of one flat `GtkButton` per user list, each calling `moveSelected(list.id)`.

That bar is mounted into the toolbar view's `bottomBar` slot, and `revealBottomBars` drives the reveal animation:

```tsx
<Stack.Screen name="List" options={{ title: titleFor(selection, lists) }}>
    {() => (
        <AdwToolbarView
            topBar={selecting ? selectionHeader : listHeader}
            bottomBar={selecting ? selectionActionBar : undefined}
            revealBottomBars={selecting}
        >
            {listBody}
        </AdwToolbarView>
    )}
</Stack.Screen>
```

::: tip
`revealBottomBars` is how `AdwToolbarView` reveals its bottom bars as a group, and the `GtkActionBar`'s own `revealed` prop drives the widget's slide transition. Both read the same flag, but the bar is only mounted while `selecting` is true, so in practice it is always `revealed` for as long as it exists.
:::

## The selectable list: a recycled `ListView`

When `selecting` is true, the list page's body renders the `SelectionView`:

```tsx
const listBody = selecting ? (
    <SelectionView tasks={visible} selectedIds={selectedIds} onSelectionChanged={setSelectedIds} />
) : (
    <TaskList /* ... */ />
);
```

`SelectionView` (in `components/selection-view.tsx`) is where GTKX's high-level `ListView` from `@gtkx/components` earns its keep:

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
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={12}
                    marginTop={10}
                    marginBottom={10}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.START}>
                        <GtkLabel halign={Gtk.Align.START}>{item.title}</GtkLabel>
                        {item.due ? (
                            <GtkLabel
                                halign={Gtk.Align.START}
                                cssClasses={["dimmed", "caption"]}
                            >
                                {formatDue(item.due) ?? ""}
                            </GtkLabel>
                        ) : null}
                    </GtkBox>
                    {item.important ? <GtkImage iconName="starred-symbolic" valign={Gtk.Align.CENTER} /> : null}
                </GtkBox>
            )}
        />
    </GtkScrolledWindow>
);
```

How the pieces map:

- `items` is your data lifted into `{ id, value }` nodes. The `id` is the stable identity GTKX uses to track a row across updates and to key the selection; `value` is the `Task` object handed back to `renderItem` as `item`.
- `selectionMode={Gtk.SelectionMode.MULTIPLE}` tells GTKX to back the list with a `Gtk.MultiSelection` model (the default is `SINGLE`, a `Gtk.SingleSelection`). This is what lets the user select more than one row at a time.
- Selection is **controlled**, exactly like a controlled input in React. `selectedIds` is the source of truth passed down, and `onSelectionChanged` reports the new array back up. Tasks routes `onSelectionChanged` straight into `setSelectedIds`, so a click on a row and a click on "Select All" both flow into the same state. That state drives the header count, the action bar's `sensitive` gating, and the batch handlers.
- `renderItem` is a normal React render function returning GTKX JSX. Here it builds a horizontal box: title stacked over a dimmed due-date caption, with a star icon on the trailing edge for important tasks.
- `estimatedItemHeight={56}` gives each recycled cell's placeholder a size request before its content renders, which keeps scrolling and the scrollbar steady in a long list.

## Recycled versus boxed: why a second kind of list

Tasks deliberately renders its tasks two different ways, and selection mode is the reason to see them side by side. The normal `TaskList` view uses a `GtkListBox` styled as a boxed list, where every task is an `AdwActionRow`:

```tsx
// components/task-list.tsx
<GtkListBox selectionMode={Gtk.SelectionMode.NONE} cssClasses={["boxed-list"]}>
    <AdwEntryRow /* the inline "Add a task…" row */ />
    {tasks.map((task) => (
        <TaskRow key={task.id} task={task} reorderable={reorderable} {...row} />
    ))}
    {/* ... */}
</GtkListBox>
```

A boxed list materializes one widget per item. That is perfect for a small, static, heavily styled list (checkboxes, star toggles, delete buttons, drag-to-reorder, the inline add row), and it is the idiomatic GNOME default for exactly that case. But it does not scale: a thousand tasks means a thousand live rows.

`SelectionView` swaps in `ListView`, which recycles a small pool of row widgets and reuses them as you scroll, so the widget count stays roughly constant no matter how many tasks exist. It is also where multi-selection is controlled from React, since `ListView` exposes `selectionMode` and id-keyed `selectedIds`/`onSelectionChanged` props, while the boxed list is deliberately `Gtk.SelectionMode.NONE` because each of its rows carries its own controls.

Both are fed the identical `visible` array, so switching into selection mode shows the same tasks, rendered through a scalable model-view stack.

## Batch actions and the shared undo flow

Each action bar button maps to one handler. Complete and Move are direct calls into the tasks API followed by exiting selection mode:

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

Delete is the interesting one, because it reuses the exact undo-toast flow that single-task deletion uses (the toast idiom itself is covered in [Feedback and Dialogs](/tutorial/feedback-and-dialogs)). Rather than confirm an irreversible action, it soft-deletes and offers Undo:

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

It copies the ids into a local `const ids = [...selectedIds]` first, so the Undo callback reads an explicit snapshot of what was selected. The copy is defensive rather than required: `setSelectedIds([])` installs a new array rather than emptying the captured one, so the closure would still hold the right ids without it. The toast message pluralizes inline (`task` vs `tasks`), the `button-clicked` handler restores each id, and the toast is pushed onto the same `AdwToastOverlay` (`toastOverlayRef`) that the single-item delete uses. Batch delete and single-item delete (the row's trash button and the Delete shortcut) therefore share one recovery path.

::: info
None of these data operations touches a widget imperatively; they are all state in, re-render out. [Data Model and Persistence](/tutorial/data-and-persistence#the-hook-state-plus-every-mutation) covers `completeMany`, `moveToList`, `trashMany`, and `restore`.
:::

## Next

Continue to [Preferences and Theming](/tutorial/preferences-and-theming) to see how `useSetting` binds the app's GSettings schema to two-way-bound rows.
