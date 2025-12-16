---
sidebar_position: 2
sidebar_label: Lists & Tables
---

# Lists & Tables

GTKX provides virtualized list components that efficiently render large datasets. These use GTK's native list infrastructure with a declarative JSX-based rendering approach.

## ListView

`ListView` renders a scrollable, virtualized list of items:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { ListView, Label, ScrolledWindow } from "@gtkx/react";

interface User {
  id: string;
  name: string;
  email: string;
}

const users: User[] = [
  { id: "1", name: "Alice", email: "alice@example.com" },
  { id: "2", name: "Bob", email: "bob@example.com" },
  // ... hundreds more
];

const UserList = () => (
  <ScrolledWindow vexpand>
    <ListView.Root
      renderItem={(user: User | null) => (
        <Label label={user?.name ?? ""} halign={Gtk.Align.START} />
      )}
    >
      {users.map((user) => (
        <ListView.Item key={user.id} id={user.id} item={user} />
      ))}
    </ListView.Root>
  </ScrolledWindow>
);
```

### How It Works

1. **`ListView.Root`** creates a `GtkListView` with a `SignalListItemFactory`
2. **`ListView.Item`** registers each data item with the internal model
3. **`renderItem`** is called with the item during bind to render the content
4. Items outside the viewport are not rendered (virtualization)

### renderItem Signature

```typescript
type RenderItemFn<T> = (item: T | null) => ReactElement;
```

- **`item`**: The data item to render, or `null` during setup (for loading/placeholder state)

## GridView

`GridView` renders items in a grid layout with automatic wrapping:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { GridView, Label, ScrolledWindow } from "@gtkx/react";

interface Photo {
  id: string;
  title: string;
  emoji: string;
}

const photos: Photo[] = [
  { id: "1", title: "Sunset", emoji: "🌅" },
  { id: "2", title: "Mountains", emoji: "🏔️" },
  // ...
];

const PhotoGrid = () => (
  <ScrolledWindow vexpand>
    <GridView.Root
      renderItem={(photo: Photo | null) => (
        <Label
          label={photo ? `${photo.emoji}\n${photo.title}` : ""}
          cssClasses={["title-1"]}
        />
      )}
    >
      {photos.map((photo) => (
        <GridView.Item key={photo.id} id={photo.id} item={photo} />
      ))}
    </GridView.Root>
  </ScrolledWindow>
);
```

## ColumnView (Tables)

For tabular data with multiple columns, use `ColumnView`. Each column has its own `renderCell` function:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { ColumnView, Label, ScrolledWindow } from "@gtkx/react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const products: Product[] = [
  { id: "1", name: "Widget", price: 9.99, stock: 100 },
  { id: "2", name: "Gadget", price: 19.99, stock: 50 },
];

const ProductTable = () => (
  <ScrolledWindow vexpand>
    <ColumnView.Root>
      <ColumnView.Column
        title="Name"
        expand
        renderCell={(product: Product | null) => (
          <Label label={product?.name ?? ""} halign={Gtk.Align.START} />
        )}
      />
      <ColumnView.Column
        title="Price"
        fixedWidth={100}
        renderCell={(product: Product | null) => (
          <Label label={product ? `$${product.price.toFixed(2)}` : ""} />
        )}
      />
      <ColumnView.Column
        title="Stock"
        fixedWidth={80}
        renderCell={(product: Product | null) => (
          <Label label={product?.stock.toString() ?? ""} />
        )}
      />
      {products.map((product) => (
        <ColumnView.Item key={product.id} id={product.id} item={product} />
      ))}
    </ColumnView.Root>
  </ScrolledWindow>
);
```

### ColumnView.Root Sorting Props

ColumnView supports sortable columns. When the user clicks a column header, the table is sorted by that column:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { ColumnView, Label, ScrolledWindow } from "@gtkx/react";
import { useMemo, useState } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
}

const products: Product[] = [
  { id: "1", name: "Widget", price: 9.99 },
  { id: "2", name: "Gadget", price: 19.99 },
];

type ColumnId = "name" | "price";

const sortFn = (a: Product, b: Product, columnId: ColumnId): number => {
  if (columnId === "name") return a.name.localeCompare(b.name);
  if (columnId === "price") return a.price - b.price;
  return 0;
};

const SortableTable = () => {
  const [sortColumn, setSortColumn] = useState<ColumnId | null>("name");
  const [sortOrder, setSortOrder] = useState<Gtk.SortType>(
    Gtk.SortType.ASCENDING
  );

  const sortedProducts = useMemo(() => {
    if (!sortColumn) return products;
    const sorted = [...products].sort((a, b) => sortFn(a, b, sortColumn));
    return sortOrder === Gtk.SortType.DESCENDING ? sorted.reverse() : sorted;
  }, [sortColumn, sortOrder]);

  return (
    <ScrolledWindow vexpand>
      <ColumnView.Root<Product, ColumnId>
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSortChange={(column, order) => {
          setSortColumn(column);
          setSortOrder(order);
        }}
      >
        <ColumnView.Column<Product>
          id="name"
          title="Name"
          expand
          renderCell={(product) => <Label label={product?.name ?? ""} />}
        />
        <ColumnView.Column<Product>
          id="price"
          title="Price"
          fixedWidth={100}
          renderCell={(product) => (
            <Label label={product ? `$${product.price}` : ""} />
          )}
        />
        {sortedProducts.map((product) => (
          <ColumnView.Item key={product.id} id={product.id} item={product} />
        ))}
      </ColumnView.Root>
    </ScrolledWindow>
  );
};
```

**Note:** ColumnView doesn't sort items internally. You must sort your data before rendering based on `sortColumn` and `sortOrder`. The `onSortChange` callback notifies you when the user clicks a column header.

| Prop           | Type                                                    | Description                                    |
| -------------- | ------------------------------------------------------- | ---------------------------------------------- |
| `sortColumn`   | `string \| null`                                        | The column id currently sorted by (controlled) |
| `sortOrder`    | `Gtk.SortType`                                          | `ASCENDING` or `DESCENDING`                    |
| `onSortChange` | `(column: string \| null, order: Gtk.SortType) => void` | Called when user clicks column headers         |

### ColumnView.Column Props

| Prop         | Type                                | Description                                    |
| ------------ | ----------------------------------- | ---------------------------------------------- |
| `id`         | `string`                            | Column identifier (required for sorting)       |
| `title`      | `string`                            | Column header text                             |
| `renderCell` | `(item: T \| null) => ReactElement` | Renders the cell content                       |
| `expand`     | `boolean`                           | Whether the column should expand to fill space |
| `resizable`  | `boolean`                           | Whether the column can be resized              |
| `fixedWidth` | `number`                            | Fixed width in pixels                          |

## DropDown

`DropDown` creates a selection dropdown using simple id/label pairs:

```tsx
import { DropDown, Label } from "@gtkx/react";
import { useState } from "react";

interface Country {
  id: string;
  name: string;
  capital: string;
}

const countries: Country[] = [
  { id: "us", name: "United States", capital: "Washington D.C." },
  { id: "uk", name: "United Kingdom", capital: "London" },
  { id: "jp", name: "Japan", capital: "Tokyo" },
];

const CountrySelector = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = countries.find((c) => c.id === selectedId);

  return (
    <>
      <DropDown.Root
        selectedId={selectedId ?? undefined}
        onSelectionChanged={(id) => setSelectedId(id)}
      >
        {countries.map((country) => (
          <DropDown.Item key={country.id} id={country.id} label={country.name} />
        ))}
      </DropDown.Root>

      {selected && <Label label={`Capital: ${selected.capital}`} />}
    </>
  );
};
```

### DropDown.Root Props

| Prop                 | Type                 | Description                                       |
| -------------------- | -------------------- | ------------------------------------------------- |
| `selectedId`         | `string`             | ID of the initially selected item                 |
| `onSelectionChanged` | `(id: string) => void` | Called when selection changes with the item's ID |

### DropDown.Item Props

| Prop    | Type     | Description                           |
| ------- | -------- | ------------------------------------- |
| `id`    | `string` | Unique identifier for this item       |
| `label` | `string` | Display text shown in the dropdown    |

## Dynamic Updates

List items respond to React state changes:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { ListView, Box, Button, Label, ScrolledWindow } from "@gtkx/react";
import { useState } from "react";

interface User {
  id: string;
  name: string;
}

const UserListWithRemove = () => {
  const [users, setUsers] = useState<User[]>([
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
  ]);

  const removeUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <ScrolledWindow vexpand>
      <ListView.Root
        renderItem={(user: User | null) => (
          <Box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
            <Label label={user?.name ?? ""} hexpand />
            <Button
              label="Remove"
              onClicked={() => user && removeUser(user.id)}
            />
          </Box>
        )}
      >
        {users.map((user) => (
          <ListView.Item key={user.id} id={user.id} item={user} />
        ))}
      </ListView.Root>
    </ScrolledWindow>
  );
};
```

## When to Use Lists vs Array Mapping

**Use `ListView`/`GridView` when:**

- Rendering many items (100+)
- Items have uniform height/size
- You need virtualization for performance

**Use standard array mapping when:**

- Rendering few items (fewer than 50)
- Items have varying sizes
- You need complex conditional rendering per item

```tsx
// Standard React pattern - fine for small lists
<Box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
  {items.map(item => (
    <Label key={item.id} label={item.name} />
  ))}
</Box>

// GTKX ListView - better for large lists
<ScrolledWindow vexpand>
  <ListView.Root
    renderItem={(item: Item | null) => (
      <Label label={item?.name ?? ""} />
    )}
  >
    {items.map(item => (
      <ListView.Item key={item.id} id={item.id} item={item} />
    ))}
  </ListView.Root>
</ScrolledWindow>
```
