---
description: "Build the navigation sidebar as one GtkListBox of AdwActionRows, derived from props, with selection synced both ways between React and GTK4."
---

# The Sidebar

`components/sidebar.tsx` renders one `GtkListBox` of `AdwActionRow`s: the smart views (All Tasks, Today, Important), then the user's lists, then Trash.

```tsx
type Entry = {
    selection: Selection;
    title: string;
    icon?: string;
    color?: string;
    count: number;
};
```

## Entries and keys

`buildEntries` stitches the fixed smart views around the dynamic user lists and caps the list with Trash:

```tsx
const buildEntries = (lists: TaskList[], counts: SidebarCounts): Entry[] => [
    { selection: { kind: "smart", view: "all" }, title: "All Tasks", icon: "view-list-symbolic", count: counts.all },
    {
        selection: { kind: "smart", view: "today" },
        title: "Today",
        icon: "x-office-calendar-symbolic",
        count: counts.today,
    },
    {
        selection: { kind: "smart", view: "important" },
        title: "Important",
        icon: "starred-symbolic",
        count: counts.important,
    },
    ...lists.map(
        (list): Entry => ({
            selection: { kind: "list", listId: list.id },
            title: list.name,
            color: list.color,
            count: counts.lists[list.id] ?? 0,
        }),
    ),
    { selection: { kind: "smart", view: "trash" }, title: "Trash", icon: "user-trash-symbolic", count: counts.trash },
];
```

The `counts` come from `sidebarCounts` in `select.ts`, computed over open tasks, and `Selection` is the discriminated union declared in [Data Model and Persistence](/tutorial/data-and-persistence).

```tsx
const keyOf = (selection: Selection): string =>
    selection.kind === "smart" ? `smart:${selection.view}` : `list:${selection.listId}`;
```

`keyOf` does double duty as the React `key` and as the identity used for selection matching.

## The list box

```tsx
return (
    <GtkScrolledWindow vexpand>
        <GtkListBox
            ref={listRef}
            cssClasses={["navigation-sidebar"]}
            onRowSelected={(row) => {
                if (!row) return;
                const entry = entries[row.getIndex()];
                if (entry && keyOf(entry.selection) !== keyOf(selection)) onSelect(entry.selection);
            }}
        >
            {entries.map((entry) => (
                <AdwActionRow key={keyOf(entry.selection)} title={entry.title} /* prefix/suffix below */ />
            ))}
        </GtkListBox>
    </GtkScrolledWindow>
);
```

`.navigation-sidebar` is the stock Adwaita class for a sidebar list box, and `row.getIndex()` lines up with the index into `entries`.

## Row slots

`AdwActionRow` exposes `prefix` and `suffix` as named `ReactNode` slots, mapping to Adwaita's `add_prefix`/`add_suffix`:

```tsx
<AdwActionRow
    key={keyOf(entry.selection)}
    title={entry.title}
    prefix={
        entry.color ? (
            <GtkBox
                valign={Gtk.Align.CENTER}
                cssClasses={[listDot(entry.color)]}
                accessibleRole={Gtk.AccessibleRole.PRESENTATION}
            />
        ) : (
            <GtkImage iconName={entry.icon} />
        )
    }
    suffix={
        entry.count > 0 ? (
            <GtkLabel valign={Gtk.Align.CENTER} cssClasses={["dimmed", "numeric"]}>
                {String(entry.count)}
            </GtkLabel>
        ) : undefined
    }
/>
```

### Colored list dots

User-list entries carry a `color` and smart views carry an `icon`, so the `prefix` ternary picks between a dot and a themed glyph. The dot is a `GtkBox` wearing `listDot(color)` from `styles.ts`, a generated class covered in [CSS](/guide/css). It is decorative, so it takes `accessibleRole={Gtk.AccessibleRole.PRESENTATION}` and stays out of the accessibility tree.

### Count badges

`.numeric` switches the label to tabular (fixed-width) figures, so counts stay aligned as they change.

## Controlled selection

The sidebar owns no selection state. It receives the current `selection` and an `onSelect` callback as props:

```tsx
export const Sidebar = ({
    lists,
    counts,
    selection,
    onSelect,
}: {
    lists: TaskList[];
    counts: SidebarCounts;
    selection: Selection;
    onSelect: (selection: Selection) => void;
}) => {
    const entries = buildEntries(lists, counts);
    const activeIndex = entries.findIndex((entry) => keyOf(entry.selection) === keyOf(selection));
    const listRef = useRef<Gtk.ListBox | null>(null);
    // ...
```

Prop changes flow back into the widget through an effect that selects the row at the active index:

```tsx
useEffect(() => {
    const box = listRef.current;
    if (!box || activeIndex < 0) return;
    const row = box.getRowAtIndex(activeIndex);
    if (row) box.selectRow(row);
}, [activeIndex]);
```

That `selectRow` call makes the list box emit `row-selected`, which runs `onRowSelected` again. The guard `keyOf(entry.selection) !== keyOf(selection)` swallows that echo, because the row it lands on already matches the current `selection` prop.

## Next

Continue to [The Task List](/tutorial/the-task-list) to see how the selected view drives `visibleTasks`.
