---
description: "How GTKX turns GIO's callback-and-finish async convention into Promise-returning methods you can await, cancel with Gio.Cancellable, and catch as GLib errors."
---

# Async Operations

GNOME's platform libraries share one asynchronous convention. An operation starts with a call that takes a `Gio.AsyncReadyCallback`, and a sibling `_finish` call extracts the result (or the error) once the callback fires. In C that means threading a callback and a `GAsyncResult` through every async call. In GTKX you never see that machinery: codegen detects every callback-and-finish pair, whether it is an instance method, a static method, or a module-level function, and generates a single call that returns a `Promise`, so reading a file, opening a file dialog, or connecting to the session bus is an ordinary `await`.

This works because the generator reads the same GObject-Introspection data that defines the C API. A call is promisified when it either ends in `_async` with a matching `_finish` sibling (the classic GIO shape, like `g_file_load_contents_async` plus `g_file_load_contents_finish`) or takes an `AsyncReadyCallback` and has a `_finish` sibling without the suffix (the GTK4 dialog shape, like `gtk_file_dialog_open` plus `gtk_file_dialog_open_finish`). The rule is the same wherever the pair lives, on an instance, on a class as a static, or at module level. Two conditions keep it honest: the initiating call must take exactly one `AsyncReadyCallback` and no other callback parameter, and the `_finish` sibling must consume only the `GAsyncResult` the callback delivers so the promise can supply it. Calls ending in `_finish` are never promisified themselves.

The call keeps its own camelCase name. There is no renaming and no suffix stripping: `load_contents_async` becomes `loadContentsAsync`, `Gtk.FileDialog`'s `open` is just `open`, and `g_bus_get` is `Gio.busGet`. If you know the C API or the GJS one, you already know what the call is named here.

## What the signatures look like

Promisification reshapes the signature in three ways. The callback parameter disappears, since the promise replaces it. The `Gio.Cancellable` parameter survives but becomes a trailing optional, so you only mention it when you need cancellation. And the return type is a `Promise` of whatever the `_finish` call returns, with C out-parameters folded into a tuple. These are the generated signatures, verbatim from `@gtkx/gi`:

```ts
// Gio.File (instance method)
loadContentsAsync(cancellable?: Cancellable | null): Promise<[boolean, number[], string]>;
queryInfoAsync(attributes: string, flags: FileQueryInfoFlags, ioPriority: number, cancellable?: Cancellable | null): Promise<FileInfo>;

// Gtk.FileDialog (instance method)
open(parent: Window | null, cancellable?: Gio.Cancellable | null): Promise<Gio.File>;

// Adw.AlertDialog (instance method)
choose(parent: Gtk.Widget | null, cancellable?: Gio.Cancellable | null): Promise<string>;

// Gio.DBusConnection (static method)
static new(stream: IOStream, guid: string | null, flags: DBusConnectionFlags, observer: DBusAuthObserver | null, cancellable?: Cancellable | null): Promise<DBusConnection>;

// Gio (module-level function)
function busGet(busType: BusType, cancellable?: Cancellable | null): Promise<DBusConnection>;
```

`loadContentsAsync` shows the tuple folding: the C function returns a boolean and fills two out-parameters (the contents and an etag), so the promise resolves to all three at once. `choose` resolves to the response ID string you registered on the alert dialog. The static `Gio.DBusConnection.new` and the module-level `Gio.busGet` both start an async connection and resolve to the `Gio.DBusConnection`, reusing the same static and module-level `_finish` calls under the hood. The `_finish` calls (`loadContentsFinish`, `openFinish`, `newFinish`, `busGetFinish`, and so on) are still generated alongside the promise-returning ones, but there is no reason to call them yourself.

## Awaiting in components

Async platform calls slot into React exactly where you would expect: event handlers and effects. Signal handler props like `onClicked` are synchronous, so the pattern is to define an `async` function and kick it off with `void`, letting the promise settle on its own. This file picker is adapted from the gtk-demo examples:

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

Note what `await dialog.open(...)` gives you that the C API cannot: the dialog result, the user dismissing the dialog, and any I/O failure all flow through one `try`/`catch`, in the order your code reads.

In effects, the same pattern applies, and the effect cleanup is the natural place to cancel work that is still in flight when the component unmounts or the dependency changes:

```tsx
import * as Gio from "@gtkx/gi/gio";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { useEffect, useState } from "react";

const FileContents = ({ path }: { path: string }) => {
    const [text, setText] = useState("");

    useEffect(() => {
        const cancellable = new Gio.Cancellable();
        const load = async () => {
            const file = Gio.fileNewForPath(path);
            const [, contents] = await file.loadContentsAsync(cancellable);
            setText(new TextDecoder().decode(new Uint8Array(contents)));
        };
        load().catch((error) => {
            if (error instanceof Gio.IOErrorEnum && error.code === Gio.IOErrorEnum.CANCELLED) return;
            if (error instanceof Error) console.error(error.message);
        });
        return () => cancellable.cancel();
    }, [path]);

    return <GtkLabel>{text}</GtkLabel>;
};
```

Everything resolves on the one JavaScript thread your components run on. GTKX drives the GLib main context from the Node.js event loop, GIO posts async completions back to that context, and the promise settles in the same tick the completion dispatches. There is no worker thread and no cross-thread marshaling, so an `await` continuation can call `setState` or touch widget refs directly.

## Cancellation with Gio.Cancellable

Every promisified method accepts an optional `Gio.Cancellable` as its last argument. Construct one, pass it in, and call `cancel()` to abort the operation; the pending promise then rejects with a `Gio.IOErrorEnum.CANCELLED` error. Passing `null` or omitting the argument means the operation runs to completion.

One cancellable can be shared across several calls, and canceling is safe at any point, including after the operation already finished. The gtk-demo pickers use this to put a deadline on a dialog:

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

Cancellation and dismissal are distinct rejections: canceling via the cancellable produces `Gio.IOErrorEnum.CANCELLED`, while the user closing a GTK4 dialog produces `Gtk.DialogError.DISMISSED`. Code that treats both as "the user changed their mind" checks for either:

```ts
const isCancellation = (error: unknown): boolean =>
    (error instanceof Gtk.DialogError && error.code === Gtk.DialogError.DISMISSED) ||
    (error instanceof Gio.IOErrorEnum && error.code === Gio.IOErrorEnum.CANCELLED);
```

## What stays callback-based

Promisification covers every callback-and-finish pair whose initiator takes a single `AsyncReadyCallback` and whose `_finish` sibling consumes only the `GAsyncResult`, wherever the pair lives. A few shapes fall outside that and keep their raw callback form.

Callbacks that are not an `AsyncReadyCallback` have no finish step to fold into a promise, so they stay callbacks. This also covers synchronous calls that merely take a progress callback next to a `_finish` sibling, like `Gio.File.copy`. `Gtk.printRunPageSetupDialogAsync` takes a `PageSetupDoneFunc` that receives the resulting page setup directly, so you call it with a plain callback:

```tsx
const settings = new Gtk.PrintSettings();
Gtk.printRunPageSetupDialogAsync(parentWindow, null, settings, (pageSetup) => {
    // use pageSetup
});
```

A pair whose `_finish` needs more than the `GAsyncResult` also stays callback-based, because the promise has only the async result to hand back. `Gtk.showUriFull` is one: its `Gtk.showUriFullFinish(parent, result)` wants the parent window as well, so the call keeps its callback and the finish keeps its two arguments:

```ts
Gtk.showUriFull(parentWindow, "https://example.com", 0, null, (source, result) => {
    const opened = Gtk.showUriFullFinish(parentWindow, result);
    // ...
});
```

Finally, a call that carries a second callback beside its `AsyncReadyCallback` stays callback-based, because the promise can only supply the one completion callback. `Gio.DBusObjectManagerClient.new` takes a `get_proxy_type_func` alongside its ready callback, so it keeps the raw shape and you call `Gio.DBusObjectManagerClient.newFinish(result)` yourself.

::: info
Whether a call returns a promise is determined by the callback-and-finish pair, and the generated TypeScript signature always tells you: a `Promise<...>` return means `await`, a `void` return with a callback parameter means callback.
:::

## Rejections are GLib errors

When an async operation fails, the `_finish` step raises a `GError`, and the promise rejects with a wrapped error object carrying the GLib `domain`, `code`, and `message`. Error enums like `Gio.IOErrorEnum` and `Gtk.DialogError` support `instanceof` against these wrapped errors by matching the domain, which is how the `isCancellation` check above works. Outside production builds, the rejection also carries a `cause` whose stack points at the line that started the operation, so an error that surfaces deep in the main loop still traces back to your `await` site. The full story of matching domains and codes is covered in [Error Handling](/guide/error-handling).
