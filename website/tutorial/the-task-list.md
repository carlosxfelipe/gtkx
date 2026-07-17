---
description: "The boxed task list pane, with search, a rounded card of rows, an inline add entry, and an empty state, all as a pure view driven by props."
---

# The Task List

The content pane of the app is the boxed task list, and it lives in `components/task-list.tsx`. It is a pure view: it holds a single local ref (to the add-entry) and takes everything else as props from `app.tsx`.

Here is the whole prop surface it accepts:

```tsx
type TaskListProps = {
    tasks: Task[];
    reorderable: boolean;
    addPlaceholder: string;
    onAddTask: (title: string) => void;
    empty: { icon: string; title: string; description: string };
    search: {
        mode: boolean;
        onModeChange: (mode: boolean) => void;
        query: string;
        onQueryChange: (query: string) => void;
    };
    row: TaskRowHandlers;
};
```

`tasks` arrives already filtered, searched, and sorted (more on that at the end). This component never decides *which* tasks to show; it only lays them out.

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

A few GTK4-isms to unpack for a React reader:

- `orientation={Gtk.Orientation.VERTICAL}` is how a `GtkBox` stacks children. `Gtk.Orientation` is a real GI enum imported from `@gtkx/gi/gtk`; you pass the enum member, not a string. `vexpand` (a bare boolean) tells the box to claim all leftover vertical space, so the list fills the pane.
- **`AdwClamp`** is the Adwaita widget that caps content width and centers it. `maximumSize={640}` means "never let the list grow past 640px wide, no matter how wide the monitor is." This is the standard GNOME reading-width treatment: on a wide screen the boxed list sits centered instead of stretching edge to edge. The `margin*` props (universal on every widget) inset it from the pane edges.
- `GtkScrolledWindow` with `vexpand` wraps the clamp so a long list scrolls.

## Search: two controlled GObject properties

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

`GtkSearchBar` is the sliding container that reveals or hides the search field. Its `search-mode-enabled` GObject property controls whether the bar is open. Every scalar GObject property gets an `onNotify<Prop>` handler; writable ones additionally get a value prop, so `search-mode-enabled` shows up as both halves here:

- `searchModeEnabled={search.mode}` is the **setter** side. React drives the bar open or closed.
- `onNotifySearchModeEnabled` is the **notify** side. GTK4 fires `notify::search-mode-enabled` whenever the property changes, including when the user presses Escape to dismiss the bar. The value can be `null`, so the code coalesces with `enabled ?? false`.

Wiring both halves back to the same state (`search.mode` / `search.onModeChange`) is what makes it a controlled component, exactly like a controlled `<input>` in React. This is the general GTKX pattern for two-way binding any GObject property.

::: tip
The names are mechanical: the GObject property `search-mode-enabled` becomes the value prop `searchModeEnabled` and the notify handler `onNotifySearchModeEnabled`, so you can predict them without looking them up. The [JSX prop model](/guide/configuration-and-codegen#the-jsx-prop-model) covers which properties get which half.
:::

`GtkSearchEntry` is the text field. Its `text` is controlled the same way (`text={search.query}`), and `onSearchChanged` fires on a debounced keystroke. The handler receives `self`, the live `Gtk.SearchEntry` instance, so `self.text` reads the current value straight off the widget. Every GTKX `on*` signal prop handler ends with this `self` argument; handlers connected with `useSignal` or `.on` receive only the signal's own arguments.

The search field is toggled from the header bar's search button in `app.tsx`, which flips the same `searchMode` state this component reads:

```tsx
onClicked={() => setSearchMode((mode) => !mode)}
```

## The boxed list

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
    {tasks.length === 0 ? (
        <AdwStatusPage /* empty state */ />
    ) : null}
</GtkBox>
```

Two things make this the idiomatic Adwaita list rather than a plain one:

- **`cssClasses={["boxed-list"]}`** applies the `.boxed-list` style class, which turns a bare `GtkListBox` into the rounded, bordered card group you see all over GNOME Settings.
- **`selectionMode={Gtk.SelectionMode.NONE}`** disables row selection. Boxed lists are not "pick one of these" lists; each row carries its own controls (a checkbox, a star, a delete button), so selecting the whole row would be meaningless.

Children of a `GtkListBox` are appended in order. The rows here are, top to bottom: the inline add entry, one `TaskRow` per task, and (only when there are tasks) a trailing add button. React's `key={task.id}` gives each `TaskRow` a stable identity so the reconciler can move, insert, and remove real GTK4 widgets in place instead of rebuilding the list.

## The inline add row

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

`AdwEntryRow` is a list row that *is* a text field, with a floating label. Its `title` (here `"Add a task…"`, passed down as `addPlaceholder`) is that label. When you type a task and press Enter, the row emits the `entry-activated` signal, which GTKX delivers as `onEntryActivated`.

Note what the handler does with `self`, the live `Adw.EntryRow`:

```tsx
onAddTask(self.text);   // read the typed text, hand it up to app.tsx
self.text = "";          // then clear the field imperatively
```

Assigning `self.text = ""` writes the GObject `text` property directly on the widget. This is a deliberate escape hatch: the field's text is not bound to a React prop, so clearing it means mutating the instance in place. Reaching for the live widget through the `self` argument (or a ref) is the normal way to do the small imperative things GTK4 expects, without threading extra state through React.

`ref={entryRef}` captures that same widget for the button below.

## The trailing "Add Task" button

```tsx
{tasks.length > 0 ? (
    <AdwButtonRow
        title="Add Task"
        startIconName="list-add-symbolic"
        onActivated={() => entryRef.current?.grabFocus()}
    />
) : null}
```

`AdwButtonRow` is a list row styled as a button, with an optional leading icon (`startIconName`). `"list-add-symbolic"` is a stock GNOME symbolic icon name, resolved from the icon theme at runtime; you never ship the asset yourself.

Its `onActivated` handler calls `entryRef.current?.grabFocus()`. `grabFocus` is the standard GTK4 method that moves keyboard focus to a widget. Tapping this button at the bottom of a long list jumps you straight back up to the add field, ready to type. The optional chain guards the mount/unmount window where the ref is still `null`.

This row only renders when there are tasks. When the list is empty the inline add row is already right there, so a second add affordance would be redundant.

## Empty states

```tsx
{tasks.length === 0 ? (
    <AdwStatusPage
        cssClasses={["compact"]}
        iconName={empty.icon}
        title={empty.title}
        description={empty.description}
    />
) : null}
```

In the shipped `task-list.tsx` this status page is rendered as `animated.AdwStatusPage` inside `<AnimatePresence initial={false}>`; the [Animations](./animations) chapter walks through that addition, so this section shows the block before it.

`AdwStatusPage` is Adwaita's centered "big icon + title + description" placeholder, the same widget GNOME apps use for empty trash, no search results, and so on. The `.compact` style class shrinks it to fit inside the list pane rather than filling a whole window.

Its content is fully data-driven from the `empty` prop, which `app.tsx` computes based on *why* the list is empty:

```tsx
const emptyFor = (selection: Selection, query: string): EmptyState => {
    if (query) return { icon: "system-search-symbolic", title: "No Results", description: `No tasks match “${query}”` };
    if (selection.kind === "smart" && selection.view === "trash")
        return { icon: "user-trash-symbolic", title: "Trash Is Empty", description: "Deleted tasks appear here" };
    if (selection.kind === "smart" && selection.view === "today")
        return {
            icon: "x-office-calendar-symbolic",
            title: "Nothing Due Today",
            description: "Tasks due today appear here",
        };
    // ...
    return { icon: "view-list-symbolic", title: "No Tasks Yet", description: "Add a task above to get started" };
};
```

So an empty Trash, an empty Today, and a fruitless search each get their own icon and copy. The `TaskList` component stays dumb; it renders whatever `empty` it is handed.

## The filter toggle

The All / Open / Done filter is not part of `TaskList` at all. It sits in the content header in `app.tsx`, as an `AdwToggleGroup`:

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

`AdwToggleGroup` is the Adwaita segmented control (one button visibly pressed at a time). Each `AdwToggle` carries a `name` and a `label`. Rather than track which *index* is active, you drive it by name: `activeName` selects the pressed toggle, and `onNotifyActiveName` reports the new name when the user clicks.

The guard (`name === "all" || ...`) narrows the incoming string to the `Filter` union before passing it up. The `.round` style class gives it the pill shape.

What makes the filter *sticky* across launches is where its state lives. `app.tsx` reads and writes it through `useSetting`, GTKX's GSettings hook:

```tsx
const [filter, setFilter] = useSetting(schema, "filter");
// ...
titleWidget={<FilterToggle filter={filter} onChange={setFilter} />}
```

`useSetting(schema, "filter")` returns a `[value, setValue]` tuple, just like `useState`, but the value is persisted in GSettings (the GNOME settings store) and typed from the compiled schema. Change the filter, quit, relaunch, and the same tab is still selected. The [Preferences and Theming](/tutorial/preferences-and-theming) page covers `useSetting` in depth; here it is enough to see that a segmented toggle plus one hook is all it takes to persist this UI state.

## Where filtering happens: `select.ts`

GTK4 ships `GtkFilterListModel` and `GtkSortListModel` for filtering and sorting inside the widget layer. **This app uses neither.** All of it is plain JavaScript over the `Task[]` array, in `select.ts`. The `TaskList` component receives the finished list and renders it.

The single entry point is `visibleTasks`:

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

Three predicates compose in one `.filter`, then a comparator sorts. Each is an ordinary pure function:

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

const matchesQuery = (task: Task, query: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    return task.title.toLowerCase().includes(q) || task.notes.toLowerCase().includes(q);
};

const matchesFilter = (task: Task, filter: Filter): boolean => {
    if (filter === "open") return !task.done;
    if (filter === "done") return task.done;
    return true;
};
```

`inSelection` handles the sidebar choice (a smart view or a user list). `matchesQuery` is the free-text search across title and notes. `matchesFilter` is the All / Open / Done toggle. They are independent, so a search inside the "Today" view with the "Open" filter ANDs all three.

Sorting is likewise a JS comparator, chosen by the persisted `sort-order` setting:

```ts
const byOrder =
    (order: SortOrder) =>
    (a: Task, b: Task): number => {
        switch (order) {
            case "due-date": {
                if (a.due === b.due) return a.position - b.position;
                if (!a.due) return 1;
                if (!b.due) return -1;
                return a.due < b.due ? -1 : 1;
            }
            case "title":
                return a.title.localeCompare(b.title);
            case "created":
                return a.createdAt.localeCompare(b.createdAt);
            default:
                return a.position - b.position;
        }
    };
```

`app.tsx` calls `visibleTasks` on every render and hands the result down as the `tasks` prop:

```tsx
const visible = visibleTasks(tasks, selection, { query: searchQuery, filter, sortOrder });
// ...
<TaskList tasks={visible} reorderable={reorderable} /* ... */ />
```

Filtering and sorting live in React state, not in a GTK4 list model. Your data transformations stay plain functions over arrays, exactly as in a web React app, and the reconciler turns the resulting list into real GTK4 widgets. The `reorderable` prop you see passed through (`sortOrder === "manual" && !searchQuery && ...`) gates drag-to-reorder on the rows, which is the subject of the next page.

::: info
Because the list is derived, `visibleTasks` recomputes on every render. At the size of a personal task list, that cost is negligible. If you ever needed to, you would memoize it with `useMemo`, the same React tool you already know, not a GTK4 model.
:::

## Next

Continue to [Task Rows and Drag-to-Reorder](/tutorial/task-rows-and-reordering) to see how each row renders its checkbox, star, and delete controls, and how drag-to-reorder is wired up.
