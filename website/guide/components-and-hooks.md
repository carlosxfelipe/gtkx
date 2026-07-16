---
description: "A map of the high-level components in @gtkx/components and the hooks exported by @gtkx/react."
---

# Components and Hooks

Almost everything you render in a GTKX app is a generated intrinsic element: one typed export per GTK4 or Adwaita widget, produced by codegen from GObject-Introspection. Two hand-written packages sit directly on top of that layer: `@gtkx/components` wraps the GTK4 APIs that do not translate cleanly into props and children, and `@gtkx/react` ships the reconciler plus a small set of hooks for talking to live GObjects. This page maps both.

Most of these components keep every intrinsic prop of the widget they wrap and forward `ref` to the raw GTK4 object. Run `gtkx docs` in your project for exhaustive per-element prop tables, and see the [API reference](/reference/) for the packages themselves.

## Why @gtkx/components exists

`@gtkx/components` puts declarative React props over imperative GTK4 setup.

GTK4's list widgets are built around a model/factory split: you hand `Gtk.ListView` a `Gio.ListModel` of items, a `Gtk.SignalListItemFactory` that fires `setup`/`bind`/`unbind` signals for cell recycling, and a selection-model wrapper around the whole thing. Trees add `Gtk.TreeListModel`, sortable tables add per-column `Gtk.Sorter` objects, and none of it is declarative.

The same goes for `Gtk.Grid.attach()`, `Gtk.Overlay.addOverlay()`, `Gtk.SizeGroup.addWidget()`, and `Gio.Menu` construction: they are imperative calls with no natural JSX shape.

`@gtkx/components` gives each of these a React vocabulary (plain arrays, `renderItem` callbacks, and `component`-injecting children) while keeping the recycling, sorting, and selection machinery of the underlying widget intact. It has two entry points: `@gtkx/components` for the GTK4-level components and `@gtkx/components/adw` for the Adwaita ones.

## The collection vocabulary

The model-backed components (`ListView`, `GridView`, `ColumnView`, and `DropDown`) share one set of types:

- `ItemNode<T>` is `{ id, value }`: a stable string id plus your data. Giving an item `children: ItemNode<T>[]` turns the collection into a tree; `hideExpander`, `indentForDepth`, and `indentForIcon` tune how tree rows are drawn.
- `SectionNode<S, T>` is `{ id, value, data }`: a group of items rendered under a shared header. Every component accepts a flat `items` array; all but `GridView` also accept a `sections` array, with a `renderHeader={({ section }) => ...}` callback for the headers.
- `RenderItemProps<T>` is what every `renderItem` callback receives: `{ item, index, depth?, isExpanded? }`. The last two are populated for tree rows.
- Selection is controlled, keyed by id: `selectedIds: string[]` and `onSelectionChanged: (ids: string[]) => void`, with `selectionMode` choosing single or multiple selection (`DropDown` is single-select, so it uses `selectedId: string | null` and `onSelectionChanged: (id: string) => void` instead).
- Expansion is controlled the same way for trees in `ListView` and `ColumnView`: `expandedIds: string[]` and `onExpandedChange: (ids: string[]) => void`.
- `estimatedItemHeight` gives the recycler a size hint before cells render, keeping scrollbars stable in long lists. `ListView` and `GridView` also take `estimatedItemWidth`, where widths vary; `ColumnView` takes only height, and `DropDown` takes no size hints.

The stable ids are what make this work across updates: selection, expansion, and cell identity survive any reordering or filtering of your arrays because they track ids, not positions.

## ListView

`ListView<T, S>` wraps `Gtk.ListView` and removes its `model`, `factory`, and `headerFactory` props: you pass data and a renderer instead. This is the Tasks app's multiple-selection view, adapted from `examples/tutorial`:

```tsx
import { ListView } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkLabel } from "@gtkx/jsx/gtk";

<ListView<Task>
    items={tasks.map((task) => ({ id: task.id, value: task }))}
    selectionMode={Gtk.SelectionMode.MULTIPLE}
    selectedIds={selectedIds}
    onSelectionChanged={setSelectedIds}
    estimatedItemHeight={56}
    renderItem={({ item }) => <GtkLabel halign={Gtk.Align.START}>{item.title}</GtkLabel>}
/>
```

Nest `children` inside your `ItemNode`s and add `expandedIds`/`onExpandedChange` and the same component renders a tree with expander arrows. Cell recycling still happens natively; your `renderItem` output is rendered into the factory-created containers through portals, so React state inside a cell behaves normally.

## GridView

`GridView<T>` applies the same treatment to `Gtk.GridView`, the icon-grid counterpart: `items`, `renderItem`, controlled selection, and size estimates, with intrinsic props like `minColumns`, `maxColumns`, and `singleClickActivate` passing straight through. The minesweeper demo in `examples/gtk-demo` renders its board this way:

```tsx
import { GridView } from "@gtkx/components";
import { GtkLabel } from "@gtkx/jsx/gtk";

<GridView
    estimatedItemHeight={32}
    minColumns={GRID_SIZE}
    maxColumns={GRID_SIZE}
    singleClickActivate
    onActivate={(position) => handleCellClick(position)}
    items={board.map((cell) => ({ id: cell.id, value: cell }))}
    renderItem={({ item }) => <GtkLabel>{getCellDisplay(item)}</GtkLabel>}
/>
```

## ColumnView

`ColumnView<T, S>` wraps `Gtk.ColumnView`, the multi-column table. Columns are declared through the `columns` prop, an array of `ColumnDef` objects, each with a required `id` and `title`, its own `renderCell`, and optional `sortable`, `expand`, `resizable`, `fixedWidth`, `visible`, and `headerMenu` props. Sorting is controlled: clicking a sortable header calls `onSortChanged(column, order)`, and you sort `items` yourself before passing them in, so the view never disagrees with your data:

```tsx
import { ColumnView, type ColumnDef } from "@gtkx/components";
import { GtkLabel } from "@gtkx/jsx/gtk";

const columns: ColumnDef<Employee>[] = [
    {
        id: "name",
        title: "Name",
        expand: true,
        sortable: true,
        renderCell: ({ item }) => <GtkLabel>{item.name}</GtkLabel>,
    },
];

<ColumnView
    sortColumn={sortColumn}
    sortOrder={sortOrder}
    onSortChanged={handleSortChange}
    items={sortedEmployees.map((emp) => ({ id: emp.id, value: emp }))}
    columns={columns}
/>
```

Typing the array as `ColumnDef<Employee>[]` binds every `renderCell` callback to the view's item type, so the `item` argument is inferred as `Employee` without annotating each callback.

## DropDown

`DropDown<T, S>` wraps `Gtk.DropDown`, which in raw GTK4 requires a model plus up to three factories (the button face, the popup rows, and popup section headers). Here it is `items` plus controlled single selection; `renderItem` draws both the button and the popup rows, `renderListItem` overrides the popup rows separately, and with no renderer at all each value is shown as a label via `String(value)`:

```tsx
import { DropDown } from "@gtkx/components";

<DropDown
    items={SOURCE_TYPES.map((type) => ({ id: type, value: type }))}
    selectedId={sourceType}
    onSelectionChanged={(id) => setSourceType(id)}
/>
```

## Menu

`Menu` builds a `Gio.Menu` model from a plain `items: MenuEntry[]` array instead of imperative `append`/`appendSection`/`appendSubmenu` calls. Each `MenuEntry` can carry a `label`, an `action` string such as `"win.new"`, and a nested `submenu` or `section` array. The component diffs entries and only rebuilds the model when they change. Because it produces a menu model rather than a widget, you pass it where a `Gio.MenuModel` is expected, such as a `GtkMenuButton`'s `menuModel` prop:

```tsx
import { Menu } from "@gtkx/components";
import { GtkMenuButton } from "@gtkx/jsx/gtk";

<GtkMenuButton
    primary
    iconName="open-menu-symbolic"
    menuModel={<Menu items={[
        { section: [{ label: "New Task", action: "win.new" }] },
        { section: [{ label: "About Tasks", action: "win.about" }] },
    ]} />}
/>
```

Actions and the `"app."`/`"win."` prefixes are covered in the tutorial's [actions chapter](/tutorial/actions-menus-shortcuts).

## Grid and Grid.Child

`Grid` wraps `Gtk.Grid`, whose placement API is `attach(child, column, row, width, height)`. `Grid.Child` expresses one placement declaratively: `column`, `row`, `columnSpan`, and `rowSpan` (spans default to 1). Name the placed widget with the `component` prop and pass its props inline:

```tsx
import { Grid } from "@gtkx/components";
import { GtkLabel } from "@gtkx/jsx/gtk";

<Grid columnSpacing={10} rowSpacing={10}>
    <Grid.Child component={GtkLabel} column={0} row={3} xalign={0}>
        Foreground
    </Grid.Child>
</Grid>
```

The `component` prop recurs in `Overlay.Child`, `Fixed.Child`, and `SizeGroup.Child` below: you name the widget to place and the wrapper attaches the ref for its imperative GTK4 call internally.

## Overlay and Overlay.Child

`Overlay` wraps `Gtk.Overlay`: regular children form the main content, and each `Overlay.Child` is stacked on top of it. `measure` opts the overlay into the size negotiation and `clipOverlay` clips it to the main child's allocation:

```tsx
import { Grid, Overlay } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkEntry } from "@gtkx/jsx/gtk";

<Overlay>
    <Grid>{buttons}</Grid>
    <Overlay.Child component={GtkEntry} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} />
</Overlay>
```

## Fixed and Fixed.Child

`Fixed` wraps `Gtk.Fixed`, the manual-positioning container. `Fixed.Child` places a widget at `x`/`y`, or accepts a full `transform: Gsk.Transform` (which overrides `x`/`y`) for rotation, scaling, and 3D placement; the fixed-layout demos in `examples/gtk-demo` assemble a 3D cube from six perspective-transformed faces and animate a rotating label per frame with `useTickCallback`.

## SizeGroup

`SizeGroup` manages a `Gtk.SizeGroup`, which keeps widgets scattered across the tree at a common width, height, or both (`mode: Gtk.SizeGroupMode`). Each `SizeGroup.Child` names the widget to add to the group; membership follows the React tree, so a `SizeGroup.Child` nested anywhere under the `SizeGroup` joins it:

```tsx
import { SizeGroup } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkButton } from "@gtkx/jsx/gtk";

<SizeGroup mode={Gtk.SizeGroupMode.HORIZONTAL}>
    <SizeGroup.Child component={GtkButton} label="Short" />
    <SizeGroup.Child component={GtkButton} label="A much longer label" />
</SizeGroup>
```

`SizeGroup.Child` forwards its `ref`, so a member can still be captured when you also need the widget instance for something else (a `mnemonicWidget` target, for example). When a member is rendered by a high-level component rather than an intrinsic element, call `useSizeGroupItem()` inside the `SizeGroup` and attach the returned ref callback to the widget.

## ConstraintLayout

`ConstraintLayout` builds a `Gtk.ConstraintLayout` for a container's `layoutManager` prop, replacing manual `Gtk.Constraint` and `Gtk.ConstraintGuide` construction. Widgets are referenced by their `name` prop, with `"super"` (or an omitted `target`/`source`) meaning the container itself; referencing an unknown name throws with a message telling you which `name` to set. `ConstraintLayout.Constraint` declares one relation (`targetAttribute`, optional `relation` defaulting to equality, `multiplier` defaulting to 1, `constant` defaulting to 0, and `strength` defaulting to required), `ConstraintLayout.Guide` declares an invisible spacer with min/natural/max sizes, and `ConstraintLayout.Vfl` applies Visual Format Language `lines`:

```tsx
import { ConstraintLayout } from "@gtkx/components";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton } from "@gtkx/jsx/gtk";

<GtkBox
    layoutManager={
        <ConstraintLayout>
            <ConstraintLayout.Constraint
                target="button1"
                targetAttribute={Gtk.ConstraintAttribute.START}
                sourceAttribute={Gtk.ConstraintAttribute.START}
                constant={8}
            />
        </ConstraintLayout>
    }
>
    <GtkButton name="button1" label="Constrained" />
</GtkBox>
```

## The Adwaita entry point: @gtkx/components/adw

`@gtkx/components/adw` holds the components that depend on Adwaita.

**`Dialog`** presents an Adwaita dialog (its `component`, defaulting to `AdwDialog`) while it is mounted and closes it on unmount, so dialog visibility becomes ordinary conditional rendering. See [Modals and Portals](/guide/modals-and-portals) for the present-on-mount, close-on-unmount contract and the `onClose` wiring.

**Alert dialogs** pass `AdwAlertDialog` (from `@gtkx/jsx/adw`) as `Dialog`'s `component`, declaring their buttons through the `responses` prop and delivering the chosen id to `onResponse`. See [Modals and Portals](/guide/modals-and-portals) for `responses`, `closeResponse`, and `onResponse`.

**Navigation is its own package.** Page stacks and the adaptive sidebar/content layout are not components here: `@gtkx/navigation` provides React Navigation-style stack and split-view navigators backed by `Adw.NavigationView` and `Adw.NavigationSplitView`, with routes, params, and hooks. See [Navigation](/guide/navigation).

**`DropDown` as a combo row**: pass `component={AdwComboRow}` to apply the `DropDown` model (`items`, `selectedId`, `onSelectionChanged`, the same renderer props) to `Adw.ComboRow`, the preferences-style row with an embedded drop-down. The Tasks app's theme and sort-order pickers in [Preferences and Theming](/tutorial/preferences-and-theming) use it.

## Hooks from @gtkx/react

`@gtkx/react` exports a set of hooks for talking to live GObjects. All of the object-observing ones accept a `GObjectTarget<T>`: a live instance, a React ref to one, or `null`/`undefined`, so you can pass a `useRef` directly and the hook attaches when the widget mounts and detaches when it goes away.

**`useApplication(): Gtk.Application`** returns the running application object from the nearest application element, and throws when called outside one. Use it for application-level imperative calls such as `sendNotification` or `addAction`.

**`useParentWindow(): Gtk.Window | null`** returns the nearest ancestor window, or `null` when there is none. It is how components like `Dialog` find their default anchor without threading a window prop through the tree.

**`useProperty(target, propertyName)`** subscribes to `notify::<property>` on a GObject and returns the property's current value, re-rendering on change and returning `undefined` while the target is unresolved. It bridges GObject property state into React state: `const formats = useProperty(clipboard, "formats")` re-renders whenever the clipboard's available formats change.

**`useSetting(schema, key): [value, setValue]`** reads and writes one key of a GSettings schema, re-rendering when the stored value changes from anywhere (including another window or `dconf`). The `schema` is the typed `SchemaRef` you get by importing a `.gschema.xml` file, so the value type and the setter are inferred per key:

```tsx
import { useSetting } from "@gtkx/react";
import schema from "#data/com.gtkx.tutorial.gschema.xml";

const [filter, setFilter] = useSetting(schema, "filter");
```

**`useBindSetting(schema, key, target, property, flags?)`** goes one step further and binds a setting directly to a GObject property with `Gio.Settings.bind`, using `Gio.SettingsBindFlags.DEFAULT` unless you pass flags. No renders are involved: GLib keeps the two in sync natively while the target is mounted. The Tasks app persists its window geometry this way:

```tsx
useBindSetting(schema, "window-width", windowRef, "defaultWidth");
useBindSetting(schema, "window-height", windowRef, "defaultHeight");
```

**`useSignal(target, signal, handler, options?)`** connects a handler to any GObject signal for the component's lifetime, reconnecting if the target changes and keeping the latest handler without re-subscribing. Signal names are typed from the bindings, including detailed forms like `"notify::label"`. Options are `after` (run after the default handler) and `immediate` (invoke once right after connecting, useful for syncing initial state):

```tsx
import { useSignal } from "@gtkx/react";

useSignal(window, "notify::fullscreened", () => setFullscreened(window.current?.isFullscreen() ?? false), { immediate: true });
```

Generated JSX elements already expose signals as `on*` props; `useSignal` is for objects you hold by ref or that are not rendered by you at all, such as models, monitors, or the clipboard.

**`useTickCallback(target, callback)`** registers a frame-clock callback on a widget via `addTickCallback`, running once per frame while the widget is mounted. Return `false` from the callback to remove it. Pass `null` as the target to pause: the gtk-demo benchmarks use `useTickCallback(isRunning ? window : null, ...)` to start and stop a frame loop from state. For property animations, [`@gtkx/css` and `@gtkx/animated`](/guide/css-and-animations) are usually the better fit; a tick callback is the tool for genuinely per-frame work such as custom drawing or transforms.

The remaining exports (`createRoot`, `quit`, `createPortal`, and `rootElement`) belong to the mounting story rather than day-to-day component code: `createRoot` and `quit` are covered in [Getting Started](/guide/getting-started), and `createPortal` in [Modals and Portals](/guide/modals-and-portals).

## Next

Continue with [Modals and Portals](/guide/modals-and-portals) for the mounting model behind these components: `createPortal`, the `rootElement` container, the `Dialog` component and `AdwAlertDialog` responses, and extra windows.
