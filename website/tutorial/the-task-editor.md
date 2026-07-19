---
description: "Navigate into a task and edit its title, importance, due date, and notes."
---

# Opening a Task

In [Smart Views, Filters, and Search](/tutorial/smart-views-and-search) you got everything the store already holds onto the screen, sliced by view, filter, and query. Rows can be ticked, starred, and thrown away, and a task is still just a title: the `notes`, `due`, `createdAt`, and `completedAt` fields you have been carrying since chapter four have nowhere to be seen or set. This chapter turns the content pane into an editor for one task, and writes every field on it through a single store action.

## Opening and closing

A task is open or it is not, and that is view state, so it belongs in the UI slice next to `selection`. Opening also has to show the content pane, because on a collapsed layout the editor is a different page rather than a neighboring column.

In `src/store/ui.ts`, add the field and the two actions:

```ts
 export type UiSlice = {
     selection: Selection;
+    selectedTaskId: string | null;
     collapsed: boolean;
     showContent: boolean;
     filter: Filter;
     searchMode: boolean;
     searchQuery: string;
     select: (selection: Selection) => void;
+    openTask: (id: string) => void;
+    closeTask: () => void;
     setCollapsed: (collapsed: boolean) => void;
```

```ts
 export const createUiSlice: StateCreator<Store, Mutators, [], UiSlice> = (set) => ({
     selection: { kind: "smart", view: "all" },
+    selectedTaskId: null,
     collapsed: false,
```

```ts
     select: (selection) =>
         set((state) => ({
             selection,
+            selectedTaskId: null,
             searchMode: false,
             searchQuery: "",
             showContent: state.collapsed,
         })),
+    openTask: (selectedTaskId) => set({ selectedTaskId, showContent: true }),
+    closeTask: () => set({ selectedTaskId: null }),
```

`select` clears `selectedTaskId` along with the search, so switching to another list closes whatever was open rather than leaving an editor for a task the sidebar no longer points at.

Now let a row open itself. An `AdwActionRow` does not respond to a click until you say it may: `activatable` makes the whole row a target, and `onActivated` fires when it is clicked or when it takes Return from the keyboard.

In `src/components/task-row.tsx`, pull `openTask` out of the store and mark the row:

```tsx
 export const TaskRow = ({ task }: { task: Task }) => {
     const setDone = useStore((state) => state.setDone);
     const setImportant = useStore((state) => state.setImportant);
+    const openTask = useStore((state) => state.openTask);
     const moveToTrash = useStore((state) => state.moveToTrash);
```

```tsx
         <AdwActionRow
             title={title}
             useMarkup
+            activatable
+            onActivated={() => openTask(task.id)}
             prefix={
```

The pane itself branches. `selectedTaskId` names a task; the pane looks it up in `tasks` and, when it finds one, renders an editor instead of the list.

In `src/components/content-pane.tsx`, read the new state and add the branch above the existing return:

```tsx
// ...
import { TaskDetail } from "./task-detail.js";
import { TaskList } from "./task-list.js";

export const ContentPane = () => {
    const tasks = useStore((state) => state.tasks);
    const selectedTaskId = useStore((state) => state.selectedTaskId);
    const closeTask = useStore((state) => state.closeTask);
    // ...
    const task = tasks.find((candidate) => candidate.id === selectedTaskId);

    if (task) {
        return (
            <AdwToolbarView topBar={<AdwHeaderBar titleWidget={<AdwWindowTitle title={task.title} />} />}>
                <TaskDetail task={task} />
            </AdwToolbarView>
        );
    }

    return (
        // ...
    );
};
```

Looking the task up rather than storing it is what keeps the editor live: every store write produces a new task object, the pane finds it, and the fields you are about to add redraw with no subscription of their own. It is also why going back needs no teardown. `closeTask` clears one field, the lookup fails on the next render, and the list is what renders.

`AdwWindowTitle` is the widget a header bar wants in `titleWidget` when the title is plain text: it handles the title typography Adwaita expects.

## One action, many fields

The editor writes four different fields. You could add `setTitle`, `setNotes`, and `setDue` next to `setDone` and `setImportant`, and you would then add another action every time the editor grows a control. Instead take a patch: an object holding whichever fields changed, merged into the task.

In `src/store/tasks.ts`, add `updateTask` to the slice type and to the creator:

```ts
     setImportant: (id: string, important: boolean) => void;
+    updateTask: (id: string, fields: Partial<Pick<Task, "title" | "notes" | "due" | "listId">>) => void;
     moveToTrash: (id: string) => void;
```

```ts
     setImportant: (id, important) => set((state) => ({ tasks: patch(state.tasks, id, { important }) })),
+    updateTask: (id, fields) => set((state) => ({ tasks: patch(state.tasks, id, fields) })),
```

`Partial<Pick<...>>` is doing real work here. `Pick` lists exactly the fields the editor may touch, so a typo like `dueDate` is a type error and a write to `id`, `createdAt`, or `done` will not compile. `Partial` then makes each of them optional, so a caller sends only what changed. `setDone` and `setImportant` stay as they are: they are not free-form edits, and `setDone` has the extra job of stamping `completedAt`.

Every control in the rest of this chapter calls `updateTask`.

## The form

Create the editor as its own component taking the task as a prop. It is a scroller wrapping an `AdwClamp`, which caps content width and centers it, so the form stays readable when the window is wide. Inside, a vertical box holds one block per band of the form.

`AdwPreferencesGroup` is the container Adwaita uses for a titled block of rows. It draws the boxed-list frame for you, so rows placed in it get the rounded card, the separators, and the spacing without any styling of your own.

Create `src/components/task-detail.tsx`:

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { AdwClamp, AdwPreferencesGroup } from "@gtkx/jsx/adw";
import { GtkBox, GtkScrolledWindow } from "@gtkx/jsx/gtk";
import { useStore } from "../store/index.js";
import type { Task } from "../types.js";

export const TaskDetail = ({ task }: { task: Task }) => {
    const updateTask = useStore((state) => state.updateTask);
    const setImportant = useStore((state) => state.setImportant);

    return (
        <GtkScrolledWindow vexpand>
            <AdwClamp maximumSize={600} marginTop={24} marginBottom={24} marginStart={12} marginEnd={12}>
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={18}>
                    <AdwPreferencesGroup />
                </GtkBox>
            </AdwClamp>
        </GtkScrolledWindow>
    );
};
```

### The title

`AdwEntryRow` is an editable row: the title is the label and the row's `text` is the value. `showApplyButton` puts a checkmark at the end of the row that lights up once the text differs from what was there, and `onApply` fires when it is clicked. `onEntryActivated` fires on Return, so both ways of finishing an edit commit.

In `src/components/task-detail.tsx`, fill the first group:

```tsx
                    <AdwPreferencesGroup>
                        <AdwEntryRow
                            title="Title"
                            text={task.title}
                            showApplyButton
                            onApply={(self) => updateTask(task.id, { title: self.text })}
                            onEntryActivated={(self) => updateTask(task.id, { title: self.text })}
                        />
                    </AdwPreferencesGroup>
```

::: warning Cursor jumps to the end while typing the title?
You wired the write to a per-keystroke signal such as `onNotifyText` or `onChanged` instead of `onApply`. Each keystroke stores a new title, the store pushes a new `text` back down, and setting `text` on an entry moves the cursor to the end, so editing anywhere but the end of the string becomes impossible. Commit on apply and on Return, and the entry owns its own text until you are done with it.
:::

### Importance

`AdwSwitchRow` is a row whose value is a switch, and that value lives in the plain GObject property `active`. There is no dedicated "the user flipped it" signal to listen to, so listen to the property instead: any GObject property `foo` emits `notify::foo` when it changes, and GTKX exposes that as the `onNotifyFoo` prop.

In `src/components/task-detail.tsx`, add the row under the title:

```tsx
                        <AdwSwitchRow
                            title="Important"
                            active={task.important}
                            onNotifyActive={(active) => setImportant(task.id, active ?? false)}
                        />
```

A notify handler receives the new value first, and that value is nullable, because the property is read back through the generic GObject machinery which can hand you nothing. `?? false` is how you settle it. You will see the same shape on every `onNotify*` handler in the app.

The switch writes through `setImportant`, the same action the star in the row uses, so flipping it also relights the star waiting for you in the list.

### The due date

A due date needs a picker, and a picker needs somewhere to appear. `GtkMenuButton` is a button that shows a popover, and its `popover` slot takes that popover as JSX: a container slot is a prop taking JSX that attaches it somewhere other than the child list, so the calendar is a child of the popover and the popover belongs to the button.

The button's label is the current date, formatted, and a clear button sits beside it only while there is something to clear.

In `src/components/task-detail.tsx`, add the third row to the group:

```tsx
                        <AdwActionRow
                            title="Due"
                            suffix={
                                <GtkBox spacing={6} valign={Gtk.Align.CENTER}>
                                    {task.due ? (
                                        <GtkButton
                                            iconName="edit-clear-symbolic"
                                            cssClasses={["flat", "circular"]}
                                            accessibleLabel="Clear due date"
                                            onClicked={() => updateTask(task.id, { due: null })}
                                        />
                                    ) : null}
                                    <GtkMenuButton
                                        label={formatDue(task.due) ?? "Set date"}
                                        popover={
                                            <GtkPopover>
                                                <GtkCalendar
                                                    date={dueDate}
                                                    onDaySelected={(self) => {
                                                        const date = self.getDate();
                                                        const picked = new Date(
                                                            date.getYear(),
                                                            date.getMonth() - 1,
                                                            date.getDayOfMonth(),
                                                            18,
                                                            0,
                                                            0,
                                                        );
                                                        updateTask(task.id, { due: picked.toISOString() });
                                                    }}
                                                />
                                            </GtkPopover>
                                        }
                                    />
                                </GtkBox>
                            }
                        />
```

The date crosses two type systems, so it is converted at both ends. Your store keeps an ISO string, which is what survives a round trip through JSON. `GtkCalendar` wants a `GLib.DateTime`. Build one at the top of the component, where a task with no due date simply gets no date at all.

In `src/components/task-detail.tsx`:

```tsx
    const setImportant = useStore((state) => state.setImportant);
    const dueDate = task.due ? GLib.DateTime.newFromIso8601(task.due, null) : undefined;
```

Coming back, `self.getDate()` hands you the selected day as a `GLib.DateTime`, and its components go into a JavaScript `Date` at six in the evening local time, a friendlier default than midnight for something you have to do.

::: warning Dates land a month early or a month late?
GLib months are one-based, January being 1, and JavaScript `Date` months are zero-based, January being 0. Every conversion between them shifts by one, which is what `date.getMonth() - 1` is doing. Going the other way, add one.
:::

::: warning Deprecation warnings from GtkCalendar?
`GtkCalendar` also carries integer `day`, `month`, and `year` properties and a `select_day` method, and those are deprecated as of GTK 4.20. Set the whole date through the `date` property and read it back with `getDate()`, as above, and nothing deprecated is touched.
:::

`formatDue` turns the stored string into that label, and it is the same function the row subtitle wants, so it goes in `src/format.ts` beside `isToday` and reuses the `startOfDay` helper already there. `formatDateTime` is the plainer one, for the timestamps at the bottom of the form.

In `src/format.ts`, add both:

```ts
// ...
export const formatDue = (iso: string | null): string | null => {
    if (!iso) return null;
    const due = new Date(iso);
    const days = Math.round((startOfDay(due) - startOfDay(new Date())) / 86_400_000);
    const time = due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (days === 0) return `Today at ${time}`;
    if (days === 1) return `Tomorrow at ${time}`;
    if (days === -1) return `Yesterday at ${time}`;
    if (days < 0) return `${-days} days ago`;
    if (days < 7) return due.toLocaleDateString([], { weekday: "long" });
    return due.toLocaleDateString([], { month: "short", day: "numeric" });
};

export const formatDateTime = (iso: string | null): string => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};
```

Returning `null` for a task with no due date is deliberate: it lets each caller decide what "no date" looks like. The menu button falls back to `"Set date"`, and the row falls back to no subtitle at all.

In `src/components/task-row.tsx`, add the subtitle:

```tsx
             title={title}
             useMarkup
+            subtitle={formatDue(task.due) ?? undefined}
             activatable
```

`?? undefined` rather than passing the `null` through: an `AdwActionRow` given an empty subtitle still reserves the line, and the row grows taller than its neighbors. Given `undefined`, the prop is not set and the row stays single-line.

### Notes

Notes are multi-line, so this is a `GtkTextView` rather than an entry. A text view keeps its content in a `GtkTextBuffer`, which is not a widget: it is a separate object holding the text, the cursor, and the undo history. GTKX exposes it as the `buffer` slot, and the buffer's text is its JSX child.

In `src/components/task-detail.tsx`, add a second block after the group:

```tsx
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                        <GtkLabel halign={Gtk.Align.START} cssClasses={["heading"]}>
                            Notes
                        </GtkLabel>
                        <GtkScrolledWindow cssClasses={["card"]} heightRequest={160}>
                            <GtkTextView
                                wrapMode={Gtk.WrapMode.WORD_CHAR}
                                cssClasses={[detailNotes]}
                                buffer={
                                    <GtkTextBuffer
                                        enableUndo
                                        onChanged={(buffer) =>
                                            updateTask(task.id, {
                                                notes: buffer.getText(
                                                    buffer.getStartIter(),
                                                    buffer.getEndIter(),
                                                    false,
                                                ),
                                            })
                                        }
                                    >
                                        {task.notes}
                                    </GtkTextBuffer>
                                }
                            />
                        </GtkScrolledWindow>
                    </GtkBox>
```

`getText` takes the range to read as two iterators, start to end, and the trailing `false` says to leave out invisible markup. `enableUndo` is the cheapest feature in the app: the buffer keeps its own edit history, so Ctrl+Z and Ctrl+Shift+Z work in the notes field for one prop.

The `card` style class gives the scroller the framed look Adwaita uses for a content box. The padding inside it is yours.

In `src/styles.ts`, add the class beside `listDot`:

```ts
// ...
export const detailNotes = css`
    padding: 6px;
    min-height: 160px;
`;
```

`css` returns a generated class name, which is why it goes into `cssClasses` as a value rather than a string literal. The [CSS guide](/guide/css) has the whole story.

### Timestamps

The last group is read-only. `createdAt` was stamped by `addTask` and `completedAt` by `setDone`, and neither has been visible until now. The `property` style class is Adwaita's convention for a row whose subtitle is the value: it swaps the emphasis so the value reads larger than the label.

In `src/components/task-detail.tsx`, add the final group:

```tsx
                    <AdwPreferencesGroup>
                        <AdwActionRow
                            cssClasses={["property"]}
                            title="Created"
                            subtitle={formatDateTime(task.createdAt)}
                        />
                        {task.completedAt ? (
                            <AdwActionRow
                                cssClasses={["property"]}
                                title="Completed"
                                subtitle={formatDateTime(task.completedAt)}
                            />
                        ) : null}
                    </AdwPreferencesGroup>
```

## Switching tasks cleanly

The editor holds state React knows nothing about: where the cursor sits in the title entry, the buffer's undo stack, and which month the calendar is showing. Go back, open a different task, and React sees the same `TaskDetail` in the same position and updates its props. The widgets survive, and so does all of that.

Give the editor a key, and they do not.

In `src/components/content-pane.tsx`:

```tsx
-                <TaskDetail task={task} />
+                <TaskDetail key={task.id} task={task} />
```

A changed key is React's instruction to throw the old tree away and build a new one, so a new task gets fresh widgets: a cursor at the start, an empty undo history, and a calendar opened on its own month. This is the same tool the task list uses to reset its scroll position when the sidebar selection changes.

## The detail header bar

The editor needs a way out, and the two commands you would otherwise scroll for belong up top. In the header bar's `start` and `end` slots, add a back button, the star, and delete.

In `src/components/content-pane.tsx`, grow the branch:

```tsx
    if (task) {
        return (
            <AdwToolbarView
                topBar={
                    <AdwHeaderBar
                        titleWidget={<AdwWindowTitle title={task.title} />}
                        start={
                            <GtkButton
                                iconName="go-previous-symbolic"
                                tooltipText="Back"
                                onClicked={closeTask}
                            />
                        }
                        end={
                            <>
                                <GtkToggleButton
                                    iconName={task.important ? "starred-symbolic" : "non-starred-symbolic"}
                                    active={task.important}
                                    tooltipText="Important"
                                    onToggled={(self) => setImportant(task.id, self.active)}
                                />
                                <GtkButton
                                    iconName="user-trash-symbolic"
                                    tooltipText="Delete"
                                    onClicked={() => moveToTrash(task.id)}
                                />
                            </>
                        }
                    />
                }
            >
                <TaskDetail key={task.id} task={task} />
            </AdwToolbarView>
        );
    }
```

Read `setImportant` and `moveToTrash` from the store at the top of the component, the same way the pane already reads `closeTask`. Deleting from here leaves the editor open over a task that is now in the trash, which is untidy. That is a real gap and you can leave it open for now: [Deleting Without Fear](/tutorial/trash-and-toasts) gives every delete in the app an undo toast and a confirmation, and closes the editor along the way.

The header title comes from the task, so applying a new title updates the header with it.

## Run it

```sh
npm run dev
```

Four things to check.

1. Click any task row. The content pane becomes a form with Title, Important, and Due at the top, a Notes box, and a Created timestamp at the bottom. The header bar shows the task's title with a back arrow on the left.
2. Change the title and press Enter. The header title follows immediately. Click the back arrow and the list is showing again, with the new title on the row.
3. Open a task and click Set date. A calendar drops down. Pick today. The button reads `Today at 6:00 PM`, a clear button appears beside it, and going back puts the same text under the row's title. Open the task again and click the clear button: the subtitle disappears from the row entirely rather than leaving a blank gap.
4. Type into Notes and press Ctrl+Z: the last thing you typed is undone. Go back, open a different task, and the notes box holds that task's notes with none of the previous undo history. Press Ctrl+Z there and nothing happens.

Everything you set survives a restart, because the store still persists on every write.

## Summary

**A row opens a task by writing one field.** `activatable` plus `onActivated` sets `selectedTaskId`, and the content pane branches on whether it finds a matching task.

**Closing needs no teardown.** `closeTask` clears the field, the lookup fails, and the list renders instead.

**One patch action serves every field.** `updateTask(id, fields)` takes a `Partial<Pick<...>>`, so the fields the editor may write are checked by the type system and no new action is needed per control.

**Adwaita rows carry the form.** `AdwPreferencesGroup` frames them, `AdwEntryRow` with `showApplyButton` commits on apply and on Return instead of per keystroke, and `AdwSwitchRow` reports through `onNotifyActive`, whose value is nullable.

**A container slot attaches JSX somewhere other than the child list.** `popover` holds the calendar, `buffer` holds the notes text, `suffix` holds the due-date controls.

**Dates convert at both edges.** An ISO string in the store, a `GLib.DateTime` for `GtkCalendar`, and one-based GLib months against zero-based JavaScript months.

**A changed key remounts.** `key={task.id}` keeps cursor position, undo history, and the visible calendar month from leaking between tasks.

## Checkpoint

The finished editor. `src/components/task-detail.tsx`:

```tsx
import * as GLib from "@gtkx/gi/glib";
import * as Gtk from "@gtkx/gi/gtk";
import { AdwActionRow, AdwClamp, AdwEntryRow, AdwPreferencesGroup, AdwSwitchRow } from "@gtkx/jsx/adw";
import {
    GtkBox,
    GtkButton,
    GtkCalendar,
    GtkLabel,
    GtkMenuButton,
    GtkPopover,
    GtkScrolledWindow,
    GtkTextBuffer,
    GtkTextView,
} from "@gtkx/jsx/gtk";
import { formatDateTime, formatDue } from "../format.js";
import { useStore } from "../store/index.js";
import { detailNotes } from "../styles.js";
import type { Task } from "../types.js";

export const TaskDetail = ({ task }: { task: Task }) => {
    const updateTask = useStore((state) => state.updateTask);
    const setImportant = useStore((state) => state.setImportant);
    const dueDate = task.due ? GLib.DateTime.newFromIso8601(task.due, null) : undefined;

    return (
        <GtkScrolledWindow vexpand>
            <AdwClamp maximumSize={600} marginTop={24} marginBottom={24} marginStart={12} marginEnd={12}>
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={18}>
                    <AdwPreferencesGroup>
                        <AdwEntryRow
                            title="Title"
                            text={task.title}
                            showApplyButton
                            onApply={(self) => updateTask(task.id, { title: self.text })}
                            onEntryActivated={(self) => updateTask(task.id, { title: self.text })}
                        />
                        <AdwSwitchRow
                            title="Important"
                            active={task.important}
                            onNotifyActive={(active) => setImportant(task.id, active ?? false)}
                        />
                        <AdwActionRow
                            title="Due"
                            suffix={
                                <GtkBox spacing={6} valign={Gtk.Align.CENTER}>
                                    {task.due ? (
                                        <GtkButton
                                            iconName="edit-clear-symbolic"
                                            cssClasses={["flat", "circular"]}
                                            accessibleLabel="Clear due date"
                                            onClicked={() => updateTask(task.id, { due: null })}
                                        />
                                    ) : null}
                                    <GtkMenuButton
                                        label={formatDue(task.due) ?? "Set date"}
                                        popover={
                                            <GtkPopover>
                                                <GtkCalendar
                                                    date={dueDate}
                                                    onDaySelected={(self) => {
                                                        const date = self.getDate();
                                                        const picked = new Date(
                                                            date.getYear(),
                                                            date.getMonth() - 1,
                                                            date.getDayOfMonth(),
                                                            18,
                                                            0,
                                                            0,
                                                        );
                                                        updateTask(task.id, { due: picked.toISOString() });
                                                    }}
                                                />
                                            </GtkPopover>
                                        }
                                    />
                                </GtkBox>
                            }
                        />
                    </AdwPreferencesGroup>

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                        <GtkLabel halign={Gtk.Align.START} cssClasses={["heading"]}>
                            Notes
                        </GtkLabel>
                        <GtkScrolledWindow cssClasses={["card"]} heightRequest={160}>
                            <GtkTextView
                                wrapMode={Gtk.WrapMode.WORD_CHAR}
                                cssClasses={[detailNotes]}
                                buffer={
                                    <GtkTextBuffer
                                        enableUndo
                                        onChanged={(buffer) =>
                                            updateTask(task.id, {
                                                notes: buffer.getText(
                                                    buffer.getStartIter(),
                                                    buffer.getEndIter(),
                                                    false,
                                                ),
                                            })
                                        }
                                    >
                                        {task.notes}
                                    </GtkTextBuffer>
                                }
                            />
                        </GtkScrolledWindow>
                    </GtkBox>

                    <AdwPreferencesGroup>
                        <AdwActionRow
                            cssClasses={["property"]}
                            title="Created"
                            subtitle={formatDateTime(task.createdAt)}
                        />
                        {task.completedAt ? (
                            <AdwActionRow
                                cssClasses={["property"]}
                                title="Completed"
                                subtitle={formatDateTime(task.completedAt)}
                            />
                        ) : null}
                    </AdwPreferencesGroup>
                </GtkBox>
            </AdwClamp>
        </GtkScrolledWindow>
    );
};
```

## Next

[Menus, Accelerators, and Shortcuts](/tutorial/actions-menus-shortcuts) turns the commands scattered across these buttons into GObject actions, puts them in a primary menu, and binds them to keys.
