---
sidebar_position: 2
---

# Lists and Data Binding

GTKX provides virtualized list components that efficiently render large datasets. Unlike React's standard array mapping, these use GTK's native list infrastructure with factory-based rendering.

## ListView

`ListView` renders a scrollable, virtualized list of items using GTK's factory pattern:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { wrapPtr } from "@gtkx/ffi";
import { ListView, ScrolledWindow } from "@gtkx/react";

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

const setupUser = (): Gtk.Label => {
  const label = new Gtk.Label();
  label.setHalign(Gtk.Align.START);
  return label;
};

const bindUser = (widget: Gtk.Widget, user: User): void => {
  const label = wrapPtr(widget.ptr, Gtk.Label);
  label.setLabel(user.name);
};

const UserList = () => (
  <ScrolledWindow vexpand>
    <ListView.Root setup={setupUser} bind={bindUser}>
      {users.map(user => (
        <ListView.Item key={user.id} item={user} />
      ))}
    </ListView.Root>
  </ScrolledWindow>
);
```

### How It Works

1. **`ListView.Root`** creates a `GtkListView` with a `SignalListItemFactory`
2. **`ListView.Item`** registers each data item with the internal model
3. **`setup`** is called once per visible cell to create the widget
4. **`bind`** is called to update the widget with item data
5. **`unbind`** (optional) is called before the widget is reused
6. **`teardown`** (optional) is called when the widget is destroyed
7. Items outside the viewport are not rendered (virtualization)

### Factory Props

| Prop | Type | Description |
|------|------|-------------|
| `setup` | `() => Gtk.Widget` | Creates a new widget for a list cell |
| `bind` | `(widget: Gtk.Widget, item: T) => void` | Updates the widget with item data |
| `unbind` | `(widget: Gtk.Widget) => void` | Optional. Called before widget is reused |
| `teardown` | `(widget: Gtk.Widget) => void` | Optional. Called when widget is destroyed |

## GridView

`GridView` renders items in a grid layout with automatic wrapping:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { wrapPtr } from "@gtkx/ffi";
import { GridView, ScrolledWindow } from "@gtkx/react";

interface Photo {
  id: string;
  title: string;
}

const setupPhoto = (): Gtk.Label => {
  const label = new Gtk.Label();
  label.setCssClasses(["title-1"]);
  return label;
};

const bindPhoto = (widget: Gtk.Widget, photo: Photo): void => {
  const label = wrapPtr(widget.ptr, Gtk.Label);
  label.setLabel(photo.title);
};

const PhotoGrid = ({ photos }: { photos: Photo[] }) => (
  <ScrolledWindow vexpand>
    <GridView.Root setup={setupPhoto} bind={bindPhoto}>
      {photos.map(photo => (
        <GridView.Item key={photo.id} item={photo} />
      ))}
    </GridView.Root>
  </ScrolledWindow>
);
```

## ColumnView (Tables)

For tabular data with multiple columns, use `ColumnView`. Each column has its own setup and bind functions:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { wrapPtr } from "@gtkx/ffi";
import { ColumnView, ScrolledWindow } from "@gtkx/react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const setupLabel = (): Gtk.Label => {
  const label = new Gtk.Label();
  label.setHalign(Gtk.Align.START);
  return label;
};

const bindName = (widget: Gtk.Widget, product: Product): void => {
  const label = wrapPtr(widget.ptr, Gtk.Label);
  label.setLabel(product.name);
};

const bindPrice = (widget: Gtk.Widget, product: Product): void => {
  const label = wrapPtr(widget.ptr, Gtk.Label);
  label.setLabel(`$${product.price.toFixed(2)}`);
};

const bindStock = (widget: Gtk.Widget, product: Product): void => {
  const label = wrapPtr(widget.ptr, Gtk.Label);
  label.setLabel(product.stock.toString());
};

const ProductTable = ({ products }: { products: Product[] }) => (
  <ScrolledWindow vexpand>
    <ColumnView.Root>
      <ColumnView.Column title="Name" setup={setupLabel} bind={bindName} expand />
      <ColumnView.Column title="Price" setup={setupLabel} bind={bindPrice} fixedWidth={100} />
      <ColumnView.Column title="Stock" setup={setupLabel} bind={bindStock} fixedWidth={80} />
      {products.map(product => (
        <ColumnView.Item key={product.id} item={product} />
      ))}
    </ColumnView.Root>
  </ScrolledWindow>
);
```

### ColumnView.Column Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Column header text |
| `setup` | `() => Gtk.Widget` | Creates a new widget for column cells |
| `bind` | `(widget: Gtk.Widget, item: T) => void` | Updates the widget with item data |
| `expand` | `boolean` | Whether the column should expand to fill space |
| `resizable` | `boolean` | Whether the column can be resized |
| `fixedWidth` | `number` | Fixed width in pixels |

## DropDown

`DropDown` creates a selection dropdown with custom item rendering:

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
  const [selected, setSelected] = useState<Country | null>(null);

  return (
    <>
      <DropDown.Root
        itemLabel={(country: Country) => country.name}
        onSelectionChanged={(country: Country) => setSelected(country)}
      >
        {countries.map(country => (
          <DropDown.Item key={country.id} item={country} />
        ))}
      </DropDown.Root>

      {selected && (
        <Label.Root label={`Capital: ${selected.capital}`} />
      )}
    </>
  );
};
```

### DropDown Props

| Prop | Type | Description |
|------|------|-------------|
| `itemLabel` | `(item: T) => string` | Required. Returns the display text for each item |
| `onSelectionChanged` | `(item: T, index: number) => void` | Called when selection changes |

## Dynamic Updates

List items respond to React state changes:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { wrapPtr } from "@gtkx/ffi";
import { ListView, Box, Button, ScrolledWindow } from "@gtkx/react";
import { useState } from "react";

interface User {
  id: string;
  name: string;
}

const setupUser = (): Gtk.Box => {
  const box = new Gtk.Box();
  box.setOrientation(Gtk.Orientation.HORIZONTAL);
  box.setSpacing(8);

  const label = new Gtk.Label();
  label.setHexpand(true);
  box.append(label);

  const button = new Gtk.Button();
  button.setLabel("Remove");
  box.append(button);

  return box;
};

const UserListWithRemove = () => {
  const [users, setUsers] = useState<User[]>([
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
  ]);

  const removeUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const bindUser = (widget: Gtk.Widget, user: User): void => {
    const box = wrapPtr(widget.ptr, Gtk.Box);
    const label = wrapPtr(box.getFirstChild()!.ptr, Gtk.Label);
    label.setLabel(user.name);

    const button = wrapPtr(box.getLastChild()!.ptr, Gtk.Button);
    button.connect("clicked", () => removeUser(user.id));
  };

  return (
    <ScrolledWindow vexpand>
      <ListView.Root setup={setupUser} bind={bindUser}>
        {users.map(user => (
          <ListView.Item key={user.id} item={user} />
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
<Box orientation={Gtk.Orientation.VERTICAL}>
  {items.map(item => (
    <Label.Root key={item.id} label={item.name} />
  ))}
</Box>

// GTKX ListView - better for large lists
<ScrolledWindow vexpand>
  <ListView.Root setup={setupItem} bind={bindItem}>
    {items.map(item => (
      <ListView.Item key={item.id} item={item} />
    ))}
  </ListView.Root>
</ScrolledWindow>
```
