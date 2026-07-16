---
description: "The task detail form: a routed screen in the content stack whose task id travels as a route param, and a React key that remounts the editor for each task you open."
---

# The Task Editor

Clicking a task in the list opens the editor: a title field, an Important switch, a due-date calendar, a notes area, and read-only metadata. This is a full detail form, and it pushes in over the list as a new page in the content stack. Two things make that work: a routed screen whose task id arrives as a route param, and a `key` that forces a fresh mount every time you open a different task.

## The task screen

The editor is a route. The content pane hosts a stack navigator (covered in **The Application Shell**) with two screens, `List` and `Task`, and opening a task navigates to the `Task` route with the task's id as a param: `navigationRef.navigate("Tasks", { screen: "Task", params: { id } })`. The stack navigator pushes the page with an animation and an automatic back button; going back pops it. The screen receives its `route` and looks the task up from the id. From `app.tsx`:

```tsx
<Stack.Screen
    name="Task"
    options={({ route }) => ({
        title: tasks.find((task) => task.id === route.params.id)?.title ?? "Task",
    })}
>
    {({ route }) => {
        const task = tasks.find((entry) => entry.id === route.params.id);
        if (!task) return null;
        return (
            <AdwToolbarView topBar={/* the detail header, below */} controllers={/* the Delete shortcut, below */}>
                <TaskDetail
                    key={task.id}
                    task={task}
                    onUpdate={(fields) => api.updateTask(task.id, fields)}
                    onSetImportant={(important) => api.setImportant(task.id, important)}
                />
            </AdwToolbarView>
        );
    }}
</Stack.Screen>
```

The id in `route.params` is the single source of truth for which task is open. The screen body and the `options` callback both read it, so the page title and the form always describe the same task, and nothing in the shell holds a separate "selected task" state that could drift.

The `key={selectedTask.id}` is the important part. React uses the key to decide whether a rendered element is "the same" component as last time. When you switch from task A to task B, the key changes, so React unmounts the old `TaskDetail` and mounts a brand new one. Every GTK4 widget inside is destroyed and rebuilt against B's data. The controlled props (the entry `text`, the buffer's text child, the calendar `date`) would re-sync on their own if you reused the instance, but the internal GTK4 state React never sees would carry A's editing session into B. Keying by id is how you get "remount on switch" for free.

::: info WHY REMOUNT INSTEAD OF DIFF
A `GtkTextView`'s buffer remembers cursor position and undo history; a `GtkCalendar` remembers which month is shown. Remounting throws all of that away and starts clean for the newly-selected task, which is exactly what you want when the identity of the thing being edited changes.
:::

## The detail header

The task screen carries its own header, built inline from the task it looked up and passed as the `topBar` of its `AdwToolbarView`:

```tsx
<AdwHeaderBar
    end={
        <>
            <GtkToggleButton
                iconName={task.important ? "starred-symbolic" : "non-starred-symbolic"}
                active={task.important}
                tooltipText="Important"
                onToggled={(self) => api.setImportant(task.id, self.active)}
            />
            <GtkButton
                iconName="user-trash-symbolic"
                tooltipText="Delete (Delete)"
                onClicked={() => handleDelete(task)}
            />
        </>
    }
/>
```

`AdwHeaderBar` exposes `start` and `end` as slot props (they map to Adwaita's `pack_start` / `pack_end`). There is no back button here, because the pushed page provides one automatically. Pressing it (or swiping back, or Escape) pops the widget, and the stack navigator reduces that pop into navigation state, so the `Task` route leaves the stack to match. A programmatic back is `navigationRef.goBack()`.

The screen also mounts its own shortcut controller through the toolbar view's `controllers` slot, binding the Delete key to `handleDelete(task)`. Because the controller lives on the task screen, the shortcut exists exactly while a task is open, with no enabling flag to track:

```tsx
controllers={
    <GtkShortcutController
        scope={Gtk.ShortcutScope.GLOBAL}
        shortcuts={makeShortcut("Delete", () => handleDelete(task), true)}
    />
}
```

`GtkToggleButton` is a pressed/unpressed button. Its `active` prop reflects the task's star, and the `iconName` switches between the filled `starred-symbolic` and the outline `non-starred-symbolic` glyph. Note the handler is `onToggled` (the `toggled` signal), and the live widget arrives as `self`, so `self.active` is the new pressed state read straight off the GTK4 instance. The delete button's `handleDelete` moves the task to Trash, pops the editor, and shows an undo toast; it is covered in **Feedback and Dialogs**.

## The editor shell: scroll, clamp, box

`task-detail.tsx` wraps everything in a scroller and an `AdwClamp`:

```tsx
export const TaskDetail = ({ task, onUpdate, onSetImportant }: TaskDetailProps) => {
    const dueDate = task.due ? GLib.DateTime.newFromIso8601(task.due, null) : undefined;

    return (
        <GtkScrolledWindow vexpand>
            <AdwClamp maximumSize={600} marginTop={24} marginBottom={24} marginStart={12} marginEnd={12}>
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={18}>
                    {/* ...groups... */}
                </GtkBox>
            </AdwClamp>
        </GtkScrolledWindow>
    );
};
```

`AdwClamp` is an Adwaita container with one job: cap the child's width at `maximumSize` (600px here) and center it, no matter how wide the window gets. It is the standard way to keep a form readable on a large monitor. Without it, the entry rows would stretch edge to edge. The margins keep it off the window chrome, and the vertical `GtkBox` with `spacing={18}` stacks the three sections with even gaps.

`GtkScrolledWindow` with `vexpand` lets the whole form scroll when the notes push it past the window height. Both `AdwClamp` and `GtkScrolledWindow` are single-child containers, so their one child is passed as JSX children and placed via `set_child` under the hood.

`GLib.DateTime.newFromIso8601(task.due, null)` parses the stored ISO string into a GLib date object up front. The second argument is a fallback timezone, consulted only when the string carries no offset. The stored strings always include one (they come from `toISOString()`, which emits a trailing `Z`), so passing `null` is fine here. `dueDate` is `undefined` when the task has no due date, and it feeds the calendar below. This is the only place `GLib.DateTime` appears in the app, and only because `GtkCalendar`'s `date` property requires one; the task data stays ISO strings, and every other date computation (`formatDue`, `formatDateTime`, the reminder sweep) works with plain JS `Date`.

## Title and Important: a preferences group

The first section is an `AdwPreferencesGroup`, which renders its rows as a single rounded "boxed list" card with separators between rows. That grouped-card look is the GNOME convention for settings-style forms.

```tsx
<AdwPreferencesGroup>
    <AdwEntryRow
        title="Title"
        text={task.title}
        showApplyButton
        onApply={(self) => onUpdate({ title: self.text })}
        onEntryActivated={(self) => onUpdate({ title: self.text })}
    />
    <AdwSwitchRow
        title="Important"
        active={task.important}
        onNotifyActive={(active) => onSetImportant(active ?? false)}
    />
    {/* Due row... */}
</AdwPreferencesGroup>
```

`AdwEntryRow` is a labeled text field styled as a list row. `showApplyButton` adds a checkmark button that appears once you edit the text, and it commits on two paths: clicking that button, or pressing Enter while it is shown, fires `apply` (`onApply`); pressing Enter with no pending edit fires `entry-activated` (`onEntryActivated`). Both read the committed text off the live widget with `self.text` and push it up through `onUpdate`. There is no per-keystroke `onChanged` handler wired to `onUpdate` here, so the title is written only when you explicitly apply it, not on every character. The `text={task.title}` binding stays controlled and re-syncs whenever the committed title changes.

`AdwSwitchRow` is an action row with a `GtkSwitch` on the trailing edge. The row has no `toggled` signal; instead you listen to the property change with `onNotifyActive`, which is the `notify::active` handler. Its first argument is the new value (typed `boolean | null`, hence the `?? false`). This is the general pattern for switch state in GTKX: read the boolean out of the `notify` on the property, not a custom event.

## The due date: a calendar in a popover

The Due row shows GTK4's `GtkCalendar` inside a `GtkPopover` hung off a `GtkMenuButton`. This is the entire due-date picker:

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
                    onClicked={() => onUpdate({ due: null })}
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
                                onUpdate({ due: picked.toISOString() });
                            }}
                        />
                    </GtkPopover>
                }
            />
        </GtkBox>
    }
/>
```

`AdwActionRow` gives you `prefix` and `suffix` slots (mapping to `add_prefix` / `add_suffix`). The whole picker lives in `suffix`: a small `GtkBox` holding an optional clear button and the menu button. The clear button only renders when there is a date to clear, and it writes `due: null`.

`GtkMenuButton` shows a `popover` and toggles it on click. Its `label` is the formatted due date (`formatDue` turns the ISO string into "Today at 3:00 PM", "Tomorrow at ...", a weekday name, and so on), falling back to "Set date". `popover` is an object slot: you hand it a `GtkPopover` element and GTKX wires it in as the button's popover. Inside, `GtkPopover` is a single-child container holding the calendar.

### Reading the calendar with GLib.DateTime

`GtkCalendar`'s `date` property takes a `GLib.DateTime`. Passing `dueDate` opens the calendar on the task's current due date (or today, when undefined). Picking a day fires the `day-selected` signal (`onDaySelected`), and the handler reads the selection back off the live widget with `self.getDate()`, which returns a fresh `GLib.DateTime`.

Converting that GLib date into a JS `Date` needs one adjustment: GLib months are 1-based (January is 1), while `Date`'s month argument is 0-based, so the code subtracts one. `getYear`, `getMonth`, and `getDayOfMonth` are `GLib.DateTime` accessors; the day is pinned to 18:00 local time (a 6 PM default reminder time), and the result is serialized back to ISO with `toISOString()`. Reaching for those accessors plus `getDate()` is deliberate: it is the non-deprecated calendar API (see the warning below), and the `GLib.DateTime` lives only long enough to be read before the due date becomes an ISO string again.

::: warning DON'T USE select_day
The older calendar API (`select_day`, plus the integer `day` / `month` / `year` properties) is deprecated since GTK 4.20. The non-deprecated path is the `date` property (a `GLib.DateTime`) for setting and `get_date()` for reading, which is exactly what this editor uses. The generated `@gtkx/gi/gtk` typings still expose the deprecated members because they strip GTK4's deprecation annotations, so it is on you to reach for `date` / `getDate` rather than `selectDay`.
:::

## Notes: a GtkTextView backed by a buffer

The single-line entry row is not enough for freeform notes, so the editor drops down to GTK4's multiline `GtkTextView` and its `GtkTextBuffer`:

```tsx
<GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6}>
    <GtkLabel halign={Gtk.Align.START} cssClasses={["heading"]}>Notes</GtkLabel>
    <GtkScrolledWindow cssClasses={["card"]} heightRequest={160}>
        <GtkTextView
            wrapMode={Gtk.WrapMode.WORD_CHAR}
            cssClasses={[detailNotes]}
            buffer={
                <GtkTextBuffer
                    enableUndo
                    onChanged={(buffer) =>
                        onUpdate({
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

In GTK4, a text view is a view onto a separate `GtkTextBuffer` model: the buffer holds the text and the undo stack, the view renders it. In GTKX that separation is explicit. `buffer` is an object slot on `GtkTextView`, and you pass a `GtkTextBuffer` element into it. The buffer's initial text is its children (`{task.notes}`), because `GtkTextBuffer` is a text container.

`enableUndo` turns on the buffer's built-in undo/redo (Ctrl+Z works with no extra code). `onChanged` fires on every edit, and the handler pulls the current text out by reading from the start iterator to the end iterator: `getText(startIter, endIter, false)`. Iterators are GTK4's cursors into buffer positions; `getStartIter()` and `getEndIter()` bracket the whole document, and the trailing `false` means "don't include invisible characters." The full string is pushed up through `onUpdate` so notes persist as you type.

The view wraps at word and character boundaries (`Gtk.WrapMode.WORD_CHAR`) and sits inside a `GtkScrolledWindow` carrying the `.card` style class, which draws the rounded bordered box around the notes area. `detailNotes` is a `@gtkx/css` generated class adding padding and a minimum height. The `.heading` class on the `GtkLabel` gives the "Notes" caption the bold section-heading style.

## Read-only metadata rows

The last group shows timestamps you can't edit. It reuses `AdwActionRow`, but with the `.property` style class, which renders a flat title-over-value pair (a small dimmed title above a full-opacity, prominent value) instead of an interactive row:

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

`subtitle` carries the value. `formatDateTime` renders the ISO string as a locale medium date plus short time, or "Never" when null. The Completed row only appears once the task has a `completedAt`, so an open task shows only its creation date. This is the idiomatic way to present read-only detail metadata in a GNOME app: same row widget as the editable fields, distinguished purely by the `.property` class.

## Next

Continue to **Actions, Menus, and Shortcuts** to wire up the app's `GSimpleAction`s, the main menu, and keyboard accelerators.
