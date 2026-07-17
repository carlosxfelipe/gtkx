---
description: "How GLib's GError model maps onto JavaScript exceptions in GTKX: catching thrown GErrors, matching them by domain and code, and constructing your own."
---

# Error Handling

A throwing GTKX binding throws a JavaScript exception when it fails, so you handle it with `try`/`catch`, exactly as you would around any other JavaScript code.

GLib-based C libraries report recoverable failures through `GError`: a fallible function takes a `GError**` out-parameter, and the caller checks it after every call. GTKX erases that convention entirely.

Every generated binding for a throwing C function (anything marked `throws` in the GObject-Introspection data) checks the out-parameter for you and, when it is set, throws the error as a JavaScript exception. You never see the `GError**` argument in a JS signature, and you never check a return flag.

The same model carries over to asynchronous calls. GIO-style async methods are promisified, so a failed operation rejects its promise with the same error object a synchronous call would have thrown. `try { await ... } catch` handles both identically. The promise model itself, including cancellation, is covered in [Async Operations](/guide/async-operations).

Failures that are not GErrors, such as passing an argument the native Rust core cannot convert, surface as plain JavaScript `Error`s rather than `GLib.Error` instances. Most errors in a GTKX app are not GErrors at all: `node:fs` throws Node.js errors with string codes like `"ENOENT"`, `fetch` rejects with a `TypeError`, and `JSON.parse` throws a `SyntaxError`. GErrors appear only when a GI binding fails, and they land on the same `try`/`catch` channel as everything else.

## What you catch: `GLib.Error`

A thrown GError is an instance of the generated `GLib.Error` class from `@gtkx/gi/glib`, and that class extends the built-in `Error`. Both `instanceof` checks hold:

```ts
import * as GLib from "@gtkx/gi/glib";

const data = "not a key file";

try {
    GLib.KeyFile.new().loadFromData(data, Buffer.byteLength(data), GLib.KeyFileFlags.NONE);
} catch (error) {
    error instanceof Error;      // true: it is a real JS Error
    error instanceof GLib.Error; // true: it is also a wrapped GError
}
```

Because it is a real `Error` subclass, it behaves like one everywhere: `String(error)` and `console.error(error)` print the message instead of an opaque object, and rethrowing or wrapping it works as expected. On top of the standard `Error` surface, a `GLib.Error` exposes the three fields of the underlying C struct:

- **`message`** is the human-readable description, the same string GLib produced.
- **`domain`** is the error domain as a numeric GQuark (`GLib.Quark` is `number`). Each library registers its own domains: file errors, GIO I/O errors, GTK4 dialog errors, and so on.
- **`code`** is the domain-specific error code, a plain number.

Its `name` is `"GLib.Error"`, and it carries a `stack` captured at the point of the failing call, so an uncaught GError in your terminal reads like any other JavaScript stack trace.

## Matching errors by domain and code

The `domain` quark and `code` number are how GLib distinguishes "file not found" from "permission denied" from "the user closed the dialog". GTKX gives you two ways to match them.

### Error domain objects

Any introspected enum that GLib marks as an error domain is generated as an `ErrorDomain` object. It carries the enum members as numeric constants, and it also works as the right-hand side of `instanceof`, matching any wrapped GError that belongs to that domain. The check is domain-only, so you combine it with a `code` comparison against the same object's members:

```ts
import * as GLib from "@gtkx/gi/glib";

const contents = "not a key file";
const keyFile = GLib.KeyFile.new();

try {
    keyFile.loadFromData(contents, Buffer.byteLength(contents), GLib.KeyFileFlags.NONE);
} catch (error) {
    if (error instanceof GLib.KeyFileError && error.code === GLib.KeyFileError.PARSE) {
        // not a valid key file
    } else {
        throw error;
    }
}
```

These domain objects are generated in any namespace whose library registers error domains. A few you will meet: `GLib.FileError`, `GLib.KeyFileError`, `GLib.MarkupError`, and `GLib.RegexError` from GLib; `Gio.IOErrorEnum`, `Gio.DBusError`, and `Gio.ResolverError` from GIO; `Gtk.DialogError` and `Gtk.BuilderError` from GTK4. Each looks like a plain enum:

```ts
Gtk.DialogError.FAILED;    // 0
Gtk.DialogError.CANCELLED; // 1
Gtk.DialogError.DISMISSED; // 2
```

A successful `instanceof` check against a domain object narrows the value's type to `{ domain, code, message }`, which is enough to branch on the code and log the message. It does not narrow to `GLib.Error`, so if you need methods like `matches` or `copy`, test `error instanceof GLib.Error` instead.

### The `matches` method

`GLib.Error` also has GLib's own comparison, `matches(domain, code)`, which checks domain and code in one call. It takes the raw quark, which you can obtain with `GLib.quarkFromString`:

```ts
import * as GLib from "@gtkx/gi/glib";

if (error instanceof GLib.Error && error.matches(GLib.quarkFromString("g-key-file-error-quark"), GLib.KeyFileError.PARSE)) {
    // not a valid key file
}
```

The domain-object `instanceof` form is shorter and does not require knowing the quark string, so prefer it; `matches` earns its keep when you already hold a quark, for example one you registered yourself.

## Synchronous calls: `try`/`catch`

Any throwing binding can be wrapped in an ordinary `try`/`catch`, right next to plain JavaScript code that throws. This loader reads a `.desktop` launcher with `node:fs` and parses it with `GLib.KeyFile`, GLib's parser for the .ini-like key files the desktop-entry format is built on, falling back to `null` when either step fails:

```ts
import { readFileSync } from "node:fs";
import * as GLib from "@gtkx/gi/glib";

type Launcher = { name: string; exec: string };

const loadLauncher = (path: string): Launcher | null => {
    try {
        const data = readFileSync(path, "utf8");
        const keyFile = GLib.KeyFile.new();
        keyFile.loadFromData(data, Buffer.byteLength(data), GLib.KeyFileFlags.NONE);
        return {
            name: keyFile.getString("Desktop Entry", "Name"),
            exec: keyFile.getString("Desktop Entry", "Exec"),
        };
    } catch {
        return null;
    }
};
```

The division of labor is the usual GTKX split: the Node.js standard library owns the file I/O, and GLib is only involved for the desktop-entry format it alone understands. The `catch` covers both channels. `readFileSync` throws a plain Node.js `Error`, where a missing file surfaces with `code === "ENOENT"`. `loadFromData` and `getString` throw `GLib.Error`s in the `GLib.KeyFileError` domain: `PARSE` for malformed data, `KEY_NOT_FOUND` or `GROUP_NOT_FOUND` for an incomplete entry.

The Tasks app from the tutorial needs even less: its JSON store in [Data and Persistence](/tutorial/data-and-persistence) is pure `node:fs` plus `JSON.parse`, with no GError in sight.

## Asynchronous calls: rejected promises

Promisified methods reject with the same `GLib.Error` objects. The most common place you will handle one is a dialog, because GTK4 reports "the user dismissed it" as an error in the `Gtk.DialogError` domain. This is adapted from the pickers demo in `examples/gtk-demo`:

```tsx
import * as Gio from "@gtkx/gi/gio";
import * as Gtk from "@gtkx/gi/gtk";

const isCancellation = (error: unknown): boolean =>
    (error instanceof Gtk.DialogError &&
        (error.code === Gtk.DialogError.DISMISSED || error.code === Gtk.DialogError.CANCELLED)) ||
    (error instanceof Gio.IOErrorEnum && error.code === Gio.IOErrorEnum.CANCELLED);

const handleOpenFile = async () => {
    const fileDialog = new Gtk.FileDialog();
    try {
        const file = await fileDialog.open(parentWindow, cancellable);
        setFile(file);
    } catch (error) {
        if (isCancellation(error)) return;
        if (error instanceof Error) console.error(error.message);
    }
};
```

The pattern to notice is matching on domain and code: each expected outcome is one `instanceof` plus a code check, and everything else falls through to the log. Which domain a canceled call rejects with depends on the API family, which [Async Operations](/guide/async-operations#cancellation-with-gio-cancellable) covers along with the rest of the `Gio.Cancellable` model.

::: tip Rejections point at their call site
A rejected native promise's `stack` describes the GIO completion callback, not your code. Outside production (`NODE_ENV !== "production"`), GTKX captures the stack of the code that started the async operation and attaches it as the rejection error's `cause`, so logging the error shows where the call originated.
:::

## Constructing GErrors yourself

Some APIs consume GErrors rather than produce them. `GLib.Error.newLiteral(domain, code, message)` builds one, and the `GLib.Error` constructor accepts the same three fields as optional props:

```ts
import * as GLib from "@gtkx/gi/glib";

const SHADER_ERROR = GLib.quarkFromString("my-app-shader-error-quark");

area.setError(GLib.Error.newLiteral(SHADER_ERROR, 0, `Fragment shader compile error:\n${log}`));
```

This is how the gtk-demo Shadertoy example reports GLSL compile failures to `Gtk.GLArea`, which then renders its error state. [OpenGL](/guide/opengl#reporting-failures-to-the-widget) covers that flow and the rest of `@gtkx/gl`. `GLib.quarkFromString` registers (or looks up) a quark for your own error domain. Pick a unique, descriptive string, conventionally ending in `-quark`.

A GError you construct behaves exactly like a caught one. It is an `Error` instance, and it matches its domain object via `instanceof`. Throw it from your own code when you want callers to handle it with the same domain and code machinery.

## Next

- [Components and Hooks](/guide/components-and-hooks) is next in the guide, covering how GTKX widgets compose and the hooks that drive them.
- Run `gtkx docs` in your project to generate reference pages for every element your libraries provide; throwing methods appear there as ordinary methods, with the error parameter already absorbed.
