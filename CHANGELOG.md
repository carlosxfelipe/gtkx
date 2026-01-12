# Changelog

## Unreleased

### Breaking Changes

#### New `x` namespace for GTKX-specific elements

All GTKX-specific virtual elements and components are now consolidated under an `x` namespace for better organization and clarity. Update your imports and JSX accordingly:

```tsx
// Before
import { ActionRow, Pack, Menu, Toolbar, Notebook, StackPage, GridChild, FixedChild, ListView, GridView, TreeListView, ColumnViewColumn, ListItem, TreeListItem, SimpleListItem, OverlayChild, Slot } from "@gtkx/react";

<AdwActionRow>
  <ActionRow.Prefix><GtkCheckButton /></ActionRow.Prefix>
  <ActionRow.Suffix><GtkButton /></ActionRow.Suffix>
</AdwActionRow>

<GtkHeaderBar>
  <Pack.Start><GtkButton /></Pack.Start>
  <Pack.End><GtkMenuButton /></Pack.End>
</GtkHeaderBar>

<GtkMenuButton>
  <Menu.Section>
    <Menu.Item id="open" label="Open" onActivate={handleOpen} />
  </Menu.Section>
</GtkMenuButton>

<GtkStack visibleChildName="page1">
  <StackPage name="page1" title="First">...</StackPage>
</GtkStack>

// After
import { x } from "@gtkx/react";

<AdwActionRow>
  <x.ActionRowPrefix><GtkCheckButton /></x.ActionRowPrefix>
  <x.ActionRowSuffix><GtkButton /></x.ActionRowSuffix>
</AdwActionRow>

<GtkHeaderBar>
  <x.PackStart><GtkButton /></x.PackStart>
  <x.PackEnd><GtkMenuButton /></x.PackEnd>
</GtkHeaderBar>

<GtkMenuButton>
  <x.MenuSection>
    <x.MenuItem id="open" label="Open" onActivate={handleOpen} />
  </x.MenuSection>
</GtkMenuButton>

<GtkStack page="page1">
  <x.StackPage id="page1" title="First">...</x.StackPage>
</GtkStack>
```

**Full migration reference:**

| Before | After |
|--------|-------|
| `ActionRow.Prefix` | `x.ActionRowPrefix` |
| `ActionRow.Suffix` | `x.ActionRowSuffix` |
| `Pack.Start` | `x.PackStart` |
| `Pack.End` | `x.PackEnd` |
| `Toolbar.Top` | `x.ToolbarTop` |
| `Toolbar.Bottom` | `x.ToolbarBottom` |
| `Menu.Item` | `x.MenuItem` |
| `Menu.Section` | `x.MenuSection` |
| `Menu.Submenu` | `x.MenuSubmenu` |
| `Notebook.Page` | `x.NotebookPage` |
| `Notebook.PageTab` | `x.NotebookPageTab` |
| `StackPage` | `x.StackPage` |
| `GridChild` | `x.GridChild` |
| `FixedChild` | `x.FixedChild` |
| `OverlayChild` | `x.OverlayChild` |
| `Overlay` | (removed - use widget directly as child) |
| `ListItem` | `x.ListItem` |
| `TreeListItem` | `x.TreeListItem` |
| `SimpleListItem` | `x.SimpleListItem` |
| `ListView` | `x.ListView` |
| `GridView` | `x.GridView` |
| `TreeListView` | `x.TreeListView` |
| `ColumnViewColumn` | `x.ColumnViewColumn` |
| `Slot` | `x.Slot` |

#### Window close handler renamed

The `onCloseRequest` prop on window widgets has been renamed to `onClose` and simplified. The handler no longer needs to return a boolean:

```tsx
// Before
<GtkApplicationWindow onCloseRequest={() => { cleanup(); return true; }}>

// After
<GtkApplicationWindow onClose={() => { cleanup(); }}>
```

#### GtkStack and AdwViewStack API changes

The `GtkStack` and `AdwViewStack` props have been renamed for clarity:

```tsx
// Before
<GtkStack visibleChildName="page1">
  <StackPage name="page1" title="First Page">...</StackPage>
</GtkStack>

// After
<GtkStack page="page1">
  <x.StackPage id="page1" title="First Page">...</x.StackPage>
</GtkStack>
```

### New Features

#### GtkScale with declarative marks

Add marks to a GtkScale slider declaratively:

```tsx
<GtkScale>
  <x.ScaleMark value={0} label="Min" />
  <x.ScaleMark value={50} />
  <x.ScaleMark value={100} label="Max" />
</GtkScale>
```

#### GtkCalendar with declarative day marks

Mark specific days on a GtkCalendar declaratively:

```tsx
<GtkCalendar>
  <x.CalendarMark day={15} />
  <x.CalendarMark day={20} />
  <x.CalendarMark day={25} />
</GtkCalendar>
```

#### GtkLevelBar with declarative offsets

Add custom offset thresholds to a GtkLevelBar:

```tsx
<GtkLevelBar>
  <x.LevelBarOffset id="low" value={0.25} />
  <x.LevelBarOffset id="high" value={0.75} />
  <x.LevelBarOffset id="full" value={1.0} />
</GtkLevelBar>
```

#### AdwToggleGroup with declarative toggles

Build toggle groups declaratively:

```tsx
<AdwToggleGroup>
  <x.Toggle id="list" iconName="view-list-symbolic" />
  <x.Toggle id="grid" iconName="view-grid-symbolic" />
  <x.Toggle id="flow" label="Flow" />
</AdwToggleGroup>
```

#### AdwExpanderRow with row and action slots

Add nested rows and action widgets to AdwExpanderRow:

```tsx
<AdwExpanderRow title="Settings">
  <x.ActionRowPrefix><GtkImage iconName="emblem-system-symbolic" /></x.ActionRowPrefix>
  <x.ExpanderRowRow>
    <AdwActionRow title="Option 1" />
    <AdwActionRow title="Option 2" />
  </x.ExpanderRowRow>
  <x.ExpanderRowAction>
    <GtkButton iconName="list-add-symbolic" />
  </x.ExpanderRowAction>
</AdwExpanderRow>
```

#### AdwNavigationView with declarative navigation

Build navigation stacks with declarative pages and controlled history:

```tsx
const [history, setHistory] = useState(["home"]);

<AdwNavigationView history={history} onHistoryChanged={setHistory}>
  <x.NavigationPage id="home" title="Home">
    <GtkButton label="Go to Details" onClicked={() => setHistory([...history, "details"])} />
  </x.NavigationPage>
  <x.NavigationPage id="details" title="Details" canPop>
    <GtkLabel label="Details content" />
  </x.NavigationPage>
</AdwNavigationView>
```

#### Estimated item height for virtualized lists

Improve initial render and scroll behavior by providing an estimated item height:

```tsx
<x.ListView estimatedItemHeight={48} renderItem={(item) => <Row item={item} />}>
  {items.map((item) => <x.ListItem key={item.id} id={item.id} value={item} />)}
</x.ListView>

<x.TreeListView estimatedItemHeight={32} renderItem={(item, row) => <TreeRow item={item} row={row} />}>
  {/* tree items */}
</x.TreeListView>

<GtkColumnView estimatedRowHeight={56}>
  <x.ColumnViewColumn id="name" title="Name" renderCell={(item) => <GtkLabel label={item.name} />} />
  {/* list items */}
</GtkColumnView>
```

### Bug Fixes

- Fixed segfault during native module cleanup when using libraries with TLS destructors (e.g., WebKit)
- Fixed test cleanup not handling SIGTERM/SIGINT properly in the testing package
- Fixed Enter key not triggering `activate` event on editable widgets in `@gtkx/testing` user events
