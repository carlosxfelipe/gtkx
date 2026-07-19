---
description: "The components/task-list.tsx pane: a search bar, a boxed list of rows, an inline add entry, and an empty state."
---

# The Task List

The content pane lives in `components/task-list.tsx` and renders a search bar, a boxed list of task rows, an inline add entry, and an empty state.

## The outer frame

```tsx
export const TaskList = ({ tasks, reorderable, addPlaceholder, onAddTask, empty, search, row }: TaskListProps) => {
    const entryRef = useRef<Adw.EntryRow | null>(null);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} vexpand>
            <GtkSearchBar /* ... */>
                {/* ... */}
            </GtkSearchBar>
            <GtkScrolledWindow vexpand>
                <AdwClamp maximumSize={640} marginTop={12} marginBottom={12} marginStart={12} marginEnd={12}>
                    {/* ... the list ... */}
                </AdwClamp>
            </GtkScrolledWindow>
        </GtkBox>
    );
};
```

`AdwClamp` caps content width and centers it, so the list stays at a comfortable reading width on a wide monitor.

## Inside the list

### Search

```tsx
<GtkSearchBar
    searchModeEnabled={search.mode}
    onNotifySearchModeEnabled={(enabled) => search.onModeChange(enabled ?? false)}
>
    <GtkSearchEntry
        placeholderText="Search tasks…"
        text={search.query}
        onSearchChanged={(self) => search.onQueryChange(self.text)}
    />
</GtkSearchBar>
```

Pairing `searchModeEnabled` with `onNotifySearchModeEnabled` makes the bar controlled, and the header bar's search button in `app.tsx` flips the same `searchMode` state.

### The boxed list

```tsx
<GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
    <GtkListBox selectionMode={Gtk.SelectionMode.NONE} cssClasses={["boxed-list"]}>
        <AdwEntryRow /* the inline add row */ />
        {tasks.map((task) => (
            <TaskRow key={task.id} task={task} reorderable={reorderable} {...row} />
        ))}
        {tasks.length > 0 ? (
            <AdwButtonRow /* trailing "Add Task" */ />
        ) : null}
    </GtkListBox>
    {/* ... empty state ... */}
</GtkBox>
```

The `.boxed-list` style class turns a bare `GtkListBox` into the rounded card group, and `SelectionMode.NONE` disables row selection because each row carries its own controls.

### The inline add row

```tsx
<AdwEntryRow
    ref={entryRef}
    title={addPlaceholder}
    onEntryActivated={(self) => {
        onAddTask(self.text);
        self.text = "";
    }}
/>
```

The text is not bound to a prop, so the handler clears the field by assigning `self.text = ""` on the live widget.

### The add button

```tsx
{tasks.length > 0 ? (
    <AdwButtonRow
        title="Add Task"
        startIconName="list-add-symbolic"
        onActivated={() => entryRef.current?.grabFocus()}
    />
) : null}
```

`AdwButtonRow` is a list row styled as a button, and activating it moves keyboard focus back to the add entry captured in `entryRef`.

### Empty states

```tsx
<AnimatePresence initial={false}>
    {tasks.length === 0 ? (
        <animated.AdwStatusPage
            key="empty"
            cssClasses={["compact"]}
            iconName={empty.icon}
            title={empty.title}
            description={empty.description}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={{ duration: 0.2 }}
        />
    ) : null}
</AnimatePresence>
```

`AdwStatusPage` is Adwaita's centered placeholder, and the `.compact` style class shrinks it to fit inside the list pane; the [Animations](./animations) chapter covers the fade.

Its content comes from the `empty` prop, which `app.tsx` computes from why the list is empty:

```tsx
const emptyFor = (selection: Selection, query: string): EmptyState => {
    if (query) return { icon: "system-search-symbolic", title: "No Results", description: `No tasks match “${query}”` };
    // ...
    return { icon: "view-list-symbolic", title: "No Tasks Yet", description: "Add a task above to get started" };
};
```

## Where the list comes from

### The filter toggle

The All / Open / Done filter sits in the content header in `app.tsx`:

```tsx
const FilterToggle = ({ filter, onChange }: { filter: Filter; onChange: (value: Filter) => void }) => (
    <AdwToggleGroup
        activeName={filter}
        cssClasses={["round"]}
        onNotifyActiveName={(name) => {
            if (name === "all" || name === "open" || name === "done") onChange(name);
        }}
    >
        <AdwToggle name="all" label="All" />
        <AdwToggle name="open" label="Open" />
        <AdwToggle name="done" label="Done" />
    </AdwToggleGroup>
);
```

Its state is persisted with [`useSetting`](/tutorial/preferences-and-theming), so the same tab is selected on the next launch:

```tsx
const [filter, setFilter] = useSetting(schema, "filter");
// ...
titleWidget={<FilterToggle filter={filter} onChange={setFilter} />}
```

### Filtering and sorting in select.ts

Filtering and sorting are plain functions over the `Task[]` array in `select.ts`, and `visibleTasks` is the entry point:

```ts
export const visibleTasks = (
    tasks: Task[],
    selection: Selection,
    options: { query: string; filter: Filter; sortOrder: SortOrder },
): Task[] =>
    tasks
        .filter(
            (task) =>
                inSelection(task, selection) &&
                matchesQuery(task, options.query) &&
                matchesFilter(task, options.filter),
        )
        .sort(byOrder(options.sortOrder));
```

`inSelection` resolves the sidebar choice, a smart view or a user list:

```ts
const inSelection = (task: Task, selection: Selection): boolean => {
    if (selection.kind === "list") return !task.deleted && task.listId === selection.listId;
    switch (selection.view) {
        case "all":
            return !task.deleted;
        case "today":
            return !task.deleted && isToday(task.due);
        case "important":
            return !task.deleted && task.important;
        case "trash":
            return task.deleted;
    }
};
```

Beside it, `matchesQuery` searches title and notes, `matchesFilter` applies the All / Open / Done toggle, and `byOrder` returns a comparator for the persisted sort order:

```ts
const byOrder =
    (order: SortOrder) =>
    (a: Task, b: Task): number => {
        switch (order) {
            case "title":
                return a.title.localeCompare(b.title);
            // ...
            default:
                return a.position - b.position;
        }
    };
```

`app.tsx` calls `visibleTasks` on every render and hands the result down:

```tsx
const visible = visibleTasks(tasks, selection, { query: searchQuery, filter, sortOrder });
// ...
<TaskList tasks={visible} reorderable={reorderable} /* ... */ />
```

## Next

Continue to [Task Rows and Drag-to-Reorder](/tutorial/task-rows-and-reordering).
