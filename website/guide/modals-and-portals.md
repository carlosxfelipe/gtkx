---
description: "How GTKX renders GTK4 surfaces that live outside the widget tree: createPortal, the rootElement container, the Dialog component's mounting model, and extra windows."
---

# Modals and Portals

Portals let a component render children into a container other than its JSX parent, while it keeps owning those children's state, props, and lifetime.

Use them for the GTK4 surfaces that refuse to nest. A dialog is not a child of the button that opened it; it is a free-floating `Adw.Dialog` presented against a window. A second window has no parent widget at all. The cells of a `Gtk.ListView` are created by a factory the moment they scroll into view.

For a worked walkthrough of toasts, confirmations, and form dialogs in a real app, read the [Feedback and Dialogs](/tutorial/feedback-and-dialogs) tutorial chapter.

## createPortal

`createPortal` from `@gtkx/react` has the same shape as its React DOM namesake, with GTK4 containers in place of DOM nodes:

```ts
import { createPortal } from "@gtkx/react";

createPortal(children: ReactNode, container: GObject.Object | RootElement, key?: string | null): ReactPortal
```

The container is either any live `GObject.Object` or the special `rootElement` marker described below. That definition is deliberately broad. The most common targets are:

- **A widget you hold a ref to.** The children are attached to that widget exactly as if they had been written as its JSX children, using the same generated container logic (append, insert, reorder) that regular children use.
- **The `Gtk.Application` object** from `useApplication()`, the natural home for extra windows.
- **`rootElement`**, the top-level container, for anything that should exist with no GTK4 parent at all.

Portaling into a widget looks like this. The container has to exist before the portal can target it, so capture it in state rather than a plain ref, which makes the portal render as soon as the widget is created:

```tsx
import type * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkLabel } from "@gtkx/jsx/gtk";
import { createPortal } from "@gtkx/react";
import { useState } from "react";

const StatusArea = () => {
    const [tray, setTray] = useState<Gtk.Box | null>(null);
    return (
        <>
            <GtkBox ref={setTray} />
            {tray && createPortal(<GtkLabel>Synced</GtkLabel>, tray)}
        </>
    );
};
```

React ownership carries over from React DOM: the children stay in the *React* tree of the component that rendered them, so context, state, and effects flow from where the portal is written, not where the widgets land. Multiple portals can target the same container, portal contents update when props change, and removing the portal unmounts and destroys its widgets.

::: info
GTKX uses this mechanism internally. The `ListView`, `GridView`, `ColumnView`, and `DropDown` components in `@gtkx/components` render your `renderItem` (or, for `ColumnView` columns, `renderCell`) output through portals into the cell containers that GTK4's list item factories create on demand. That is why fully declarative, stateful list cells work at all: each cell is a portal target.
:::

## The root element

`rootElement`, exported from `@gtkx/react`, is a singleton marker object, not a widget. It is the default container of `createRoot()`, which is why the entry point of a GTKX app passes no argument: the "root" of a native app is not an element in a page.

Portaling to `rootElement` means "mount this with no GTK4 parent." No attach call is made on the native side; the widget is created top-level. That is exactly what windows and dialogs need, since GTK4 forbids them from being parented into a layout. Relationships between top-level windows are expressed with window properties instead, chiefly `transientFor`:

```tsx
import { GtkWindow } from "@gtkx/jsx/gtk";
import { createPortal, rootElement, useParentWindow } from "@gtkx/react";

const DetachedPreview = ({ open }: { open: boolean }) => {
    const parent = useParentWindow();
    if (!open) return null;
    return createPortal(
        <GtkWindow title="Preview" transientFor={parent} defaultWidth={480} defaultHeight={360} />,
        rootElement,
    );
};
```

The portaled window has no widget parent (`getParent()` returns `null`), but `transientFor` is the hint window managers use to keep it stacked above its owner and center it over it. Setting the prop back to `null` clears the relationship.

## Declarative dialogs

Adwaita dialogs have an imperative API: you call `dialog.present(parent)` to show one and `dialog.forceClose()` to dismiss it. The `Dialog` component from `@gtkx/components/adw` converts that protocol into the React contract you want: **mounting the component presents the dialog, unmounting it closes the dialog.**

```tsx
import { Dialog } from "@gtkx/components/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";

const Notice = ({ onClose }: { onClose: () => void }) => (
    <Dialog onClose={onClose} title="Notice">
        <GtkLabel label="Nothing to report." />
    </Dialog>
);
```

Showing it is a conditional render, the same as any other component. `Dialog` takes a `component` prop naming the dialog widget to present, defaulting to `AdwDialog`, and accepts that widget's own props and children directly.

The `component` prop, the `parent` anchor, the portal to the root, the present/forceClose effect, and the guard that keeps a React-driven close from re-firing `onClose` are all worked through in [Feedback and Dialogs](/tutorial/feedback-and-dialogs#how-a-dialog-gets-on-screen).

## Alert dialogs

`Adw.AlertDialog` is the message-and-buttons modal. Passing `AdwAlertDialog` as `Dialog`'s `component` turns its imperative `addResponse`/`setResponseAppearance` calls into a declarative `responses` array, and the chosen button's `id` arrives on `onResponse`.

The `responses` entry shape (`id`, `label`, `appearance`) and the `defaultResponse`/`closeResponse` safety pair are covered in [Confirming the irreversible](/tutorial/feedback-and-dialogs#confirming-the-irreversible). The same chapter builds a form inside an alert dialog in [the New List dialog](/tutorial/feedback-and-dialogs#the-new-list-dialog-a-form-in-an-alert-dialog).

## Finding the parent window

`useParentWindow()` from `@gtkx/react` returns the `Gtk.Window` provided by the nearest window ancestor in the React tree, or `null` when there is none. Every window element (anything GTKX wraps as a window, such as `GtkWindow`, `GtkApplicationWindow`, and `AdwApplicationWindow`) provides this context to its children. Because the context follows the *React* tree, it survives portals: a dialog portaled to `rootElement` from deep inside a window's subtree still resolves that window as its parent, which is precisely how `Dialog` anchors itself without being told where it is.

## Multiple windows

Windows carry their lifecycle in the element itself: on mount a window element calls `present()`, and on unmount it destroys the window. So a second window is another conditionally rendered element. Render it as a sibling of your main window under the application, or portal it from wherever the owning state lives:

```tsx
import { GtkApplicationWindow } from "@gtkx/jsx/gtk";
import { createPortal, useApplication } from "@gtkx/react";

const MirrorWindow = ({ open }: { open: boolean }) => {
    const app = useApplication();
    if (!open) return null;
    return createPortal(<GtkApplicationWindow title="Mirror" defaultWidth={400} defaultHeight={300} />, app);
};
```

Targeting the `Gtk.Application` object and targeting `rootElement` both produce a top-level window; use `transientFor` when the extra window should stay stacked above another one, and wire `onCloseRequest` to clear the state that mounted the window, so React stays in charge of when it goes away. Each window provides its own `useParentWindow()` context, so dialogs opened inside a secondary window anchor to that window automatically.

Every dialog and window element, along with its full prop surface, is covered by the element reference `gtkx docs` generates for your project.

## Next

[Navigation](/guide/navigation) covers the other way a surface takes over the screen: pushing a page onto a stack instead of presenting over it.
