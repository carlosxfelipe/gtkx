---
description: "How GTKX turns GIO's callback-and-finish async convention into Promise-returning methods you can await, cancel with Gio.Cancellable, and catch as GLib errors."
---

# Async Operations

GIO's async operations come in callback-and-finish pairs: a call taking a `Gio.AsyncReadyCallback` starts the work, and a sibling `_finish` call extracts the result (or the error) once the callback fires. GTKX's codegen collapses each pair into a single method that returns a `Promise`, so opening a file dialog, reading the file it hands back, or connecting to the session bus is an ordinary `await`.

Here's an example of a promisified method (from `Gio.File`):

```ts
loadContentsAsync(cancellable?: Cancellable | null): Promise<[boolean, number[], string]>;
```

## Awaiting async operations

Async operations can be awaited just like regular JS promises:

```tsx
import * as Gio from "@gtkx/gi/gio";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkButton } from "@gtkx/jsx/gtk";
import { useParentWindow } from "@gtkx/react";

const OpenButton = ({ onFile }: { onFile: (file: Gio.File) => void }) => {
    const parentWindow = useParentWindow();

    const handleOpen = async () => {
        const dialog = new Gtk.FileDialog();
        dialog.setTitle("Open file");
        try {
            const file = await dialog.open(parentWindow, null);
            onFile(file);
        } catch (error) {
            if (error instanceof Gtk.DialogError && error.code === Gtk.DialogError.DISMISSED) return;
            if (error instanceof Error) console.error(error.message);
        }
    };

    return <GtkButton iconName="document-open-symbolic" onClicked={() => void handleOpen()} />;
};
```

## Cancellation with Gio.Cancellable

Every promisified method accepts an optional `Gio.Cancellable` as its last argument.

```tsx
import * as Gio from "@gtkx/gi/gio";
import * as Gtk from "@gtkx/gi/gtk";

const runWithTimeout = async (action: (cancellable: Gio.Cancellable) => Promise<void>) => {
    const cancellable = new Gio.Cancellable();
    const timeoutId = setTimeout(() => cancellable.cancel(), 20_000);
    try {
        await action(cancellable);
    } finally {
        clearTimeout(timeoutId);
    }
};

await runWithTimeout(async (cancellable) => {
    const dialog = new Gtk.FileDialog();
    const file = await dialog.open(null, cancellable);
    // ...
});
```

## Next

Continue with [Error Handling](/guide/error-handling) for the full story on matching GLib error domains and codes.
