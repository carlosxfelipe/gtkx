---
sidebar_position: 3
sidebar_label: Grid Layout
---

# Grid Layout

The `Grid` component provides a two-dimensional layout system where you can position children at specific rows and columns with optional spanning.

## Basic Usage

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { Grid, Label, Entry, Button } from "@gtkx/react";

const LoginForm = () => (
  <Grid.Root columnSpacing={12} rowSpacing={8}>
    <Grid.Child row={0} column={0}>
      <Label label="Username:" halign={Gtk.Align.END} />
    </Grid.Child>
    <Grid.Child row={0} column={1}>
      <Entry hexpand />
    </Grid.Child>

    <Grid.Child row={1} column={0}>
      <Label label="Password:" halign={Gtk.Align.END} />
    </Grid.Child>
    <Grid.Child row={1} column={1}>
      <Entry visibility={false} hexpand />
    </Grid.Child>

    <Grid.Child row={2} column={0} columnSpan={2}>
      <Button label="Login" cssClasses={["suggested-action"]} />
    </Grid.Child>
  </Grid.Root>
);
```

## Grid.Root Props

| Prop                | Type      | Description                           |
| ------------------- | --------- | ------------------------------------- |
| `columnSpacing`     | `number`  | Gap between columns in pixels         |
| `rowSpacing`        | `number`  | Gap between rows in pixels            |
| `columnHomogeneous` | `boolean` | If true, all columns have equal width |
| `rowHomogeneous`    | `boolean` | If true, all rows have equal height   |

## Grid.Child Props

| Prop         | Type     | Default | Description                 |
| ------------ | -------- | ------- | --------------------------- |
| `row`        | `number` | `0`     | Row position (0-indexed)    |
| `column`     | `number` | `0`     | Column position (0-indexed) |
| `rowSpan`    | `number` | `1`     | Number of rows to span      |
| `columnSpan` | `number` | `1`     | Number of columns to span   |

## How It Works

`Grid.Child` is a virtual node that:

1. Stores the row, column, and span metadata
2. Calls `grid.attach(widget, column, row, columnSpan, rowSpan)` when mounted
3. Calls `grid.remove(widget)` when unmounted
4. Re-attaches with new position if props change

## Spanning Cells

Use `rowSpan` and `columnSpan` to create cells that span multiple rows or columns:

```tsx
<Grid.Root columnSpacing={8} rowSpacing={8}>
  {/* Header spanning all 3 columns */}
  <Grid.Child row={0} column={0} columnSpan={3}>
    <Label label="Settings" cssClasses={["title-2"]} />
  </Grid.Child>

  {/* Sidebar spanning 2 rows */}
  <Grid.Child row={1} column={0} rowSpan={2}>
    <Box
      orientation={Orientation.VERTICAL}
      spacing={8}
      cssClasses={["card"]}
      vexpand
    >
      Navigation
    </Box>
  </Grid.Child>

  {/* Content areas */}
  <Grid.Child row={1} column={1} columnSpan={2}>
    Main content
  </Grid.Child>
  <Grid.Child row={2} column={1} columnSpan={2}>
    Secondary content
  </Grid.Child>
</Grid.Root>
```

## Dynamic Grid Content

Grid children can be rendered conditionally or from arrays:

```tsx
import { Grid, Label } from "@gtkx/react";

interface Cell {
  id: string;
  row: number;
  column: number;
  content: string;
}

const DynamicGrid = ({ cells }: { cells: Cell[] }) => (
  <Grid.Root columnSpacing={8} rowSpacing={8}>
    {cells.map((cell) => (
      <Grid.Child key={cell.id} row={cell.row} column={cell.column}>
        <Label label={cell.content} />
      </Grid.Child>
    ))}
  </Grid.Root>
);
```

## Form Layouts

Grids are ideal for form layouts with aligned labels and inputs:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { Grid, Label, Entry, Switch, Button, Box } from "@gtkx/react";

const SettingsForm = () => (
  <Grid.Root columnSpacing={16} rowSpacing={12}>
    <Grid.Child row={0} column={0}>
      <Label label="Display Name" halign={Gtk.Align.END} />
    </Grid.Child>
    <Grid.Child row={0} column={1}>
      <Entry hexpand placeholderText="Enter your name" />
    </Grid.Child>

    <Grid.Child row={1} column={0}>
      <Label label="Email" halign={Gtk.Align.END} />
    </Grid.Child>
    <Grid.Child row={1} column={1}>
      <Entry hexpand placeholderText="you@example.com" />
    </Grid.Child>

    <Grid.Child row={2} column={0}>
      <Label label="Notifications" halign={Gtk.Align.END} />
    </Grid.Child>
    <Grid.Child row={2} column={1}>
      <Switch halign={Gtk.Align.START} />
    </Grid.Child>

    <Grid.Child row={3} column={1}>
      <Box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} halign={Gtk.Align.END}>
        <Button label="Cancel" />
        <Button label="Save" cssClasses={["suggested-action"]} />
      </Box>
    </Grid.Child>
  </Grid.Root>
);
```

## Grid vs Box

| Feature     | Grid                        | Box                         |
| ----------- | --------------------------- | --------------------------- |
| Dimensions  | 2D (rows and columns)       | 1D (horizontal or vertical) |
| Positioning | Explicit row/column         | Sequential order            |
| Spanning    | Supports rowSpan/columnSpan | Not applicable              |
| Use case    | Forms, complex layouts      | Simple lists, toolbars      |

Use `Box` for simple sequential layouts and `Grid` when you need precise 2D positioning.
