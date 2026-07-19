---
description: "The task detail form: a routed screen whose task id travels as a route param."
---

# The Task Editor

Clicking a task opens the editor, a routed screen holding the title field, the Important switch, the due-date calendar, the notes area, and read-only metadata.

## The task screen

The editor is the `Task` route of the content stack, set up in [The Application Shell](/tutorial/app-shell#the-content-stack). `openTask(id)` navigates to it, and the task id travels in `route.params`, so both the screen body and its `options` callback look up the same task. Here is the body from `app.tsx`:

```tsx
<AdwToolbarView topBar={<>{/* the detail header, below */}</>} controllers={<>{/* the Delete shortcut, below */}</>}>
    <TaskDetail
        key={task.id}
        task={task}
        onUpdate={(fields) => api.updateTask(task.id, fields)}
        onSetImportant={(important) => api.setImportant(task.id, important)}
    />
</AdwToolbarView>
```

Switching tasks changes the `key`, so React remounts `TaskDetail` and no GTK4 editing state (cursor position, undo history, the visible calendar month) carries over from the previous task.

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

The screen also mounts its own [shortcut controller](/tutorial/actions-menus-shortcuts#view-shortcuts-gtkshortcutcontroller-for-ephemeral-keys) through the toolbar view's `controllers` slot, binding the Delete key to `handleDelete(task)`:

```tsx
controllers={
    <GtkShortcutController
        scope={Gtk.ShortcutScope.GLOBAL}
        shortcuts={makeShortcut("Delete", () => handleDelete(task), true)}
    />
}
```

`handleDelete(task)` moves a live task to Trash with an undo toast, and asks for confirmation when the task is already in Trash, both covered in [Feedback and Dialogs](/tutorial/feedback-and-dialogs).

## The form

`task-detail.tsx` wraps everything in a scroller and an [`AdwClamp`](/tutorial/the-task-list#the-outer-frame):

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

`dueDate` is the task's due date parsed into the `GLib.DateTime` the calendar needs, or `undefined` when the task has none.

### Title and Important

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

`showApplyButton` reveals a checkmark as soon as you edit the text, so the title is written on `apply` or on Enter rather than per keystroke. `onNotifyActive` is the `notify::active` handler, and its value is nullable, hence the `?? false`.

### Due date

The Due row shows GTK4's `GtkCalendar` inside a `GtkPopover` hung off a `GtkMenuButton`:

```tsx
<AdwActionRow
    title="Due"
    suffix={
        <GtkBox spacing={6} valign={Gtk.Align.CENTER}>
            {/* ...optional clear button, writing due: null... */}
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

The menu button's label falls back to "Set date" when the task has no due date. GLib months are 1-based, so the handler subtracts one when building the JS `Date`, and pins the time to 18:00 local. Set the due date through the `date` property and read it back with `getDate()`: `select_day` and the integer `day`/`month`/`year` properties are deprecated since GTK 4.20.

### Notes

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

`enableUndo` turns on the buffer's built-in undo/redo, so Ctrl+Z works with no extra code, `onChanged` persists the notes as you type, and `detailNotes` is a `@gtkx/css` generated class adding padding and a minimum height.

### Metadata

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

`formatDateTime` renders the ISO string as a locale medium date plus short time.

## Next

Continue to [Actions, Menus, and Shortcuts](/tutorial/actions-menus-shortcuts).
