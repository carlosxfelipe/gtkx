# Error Handling

When GTK or GLib operations fail, GTKX throws a `NativeError` that wraps the underlying `GError`.

## NativeError

When GTK operations fail, GTKX throws `NativeError` with the error `message` and `code` from the underlying GLib error:

```tsx
import { NativeError } from "@gtkx/ffi";

try {
  await someGtkOperation();
} catch (error) {
  if (error instanceof NativeError) {
    console.log(`Error: ${error.message}`);
    console.log(`Code: ${error.code}`);
  }
}
```

## Handling Dialog Cancellation

Dialogs throw `NativeError` when the user cancels. This is expected behavior:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { NativeError } from "@gtkx/ffi";

const pickFile = async (window: Gtk.Window) => {
  try {
    return await new Gtk.FileDialog().openAsync(window);
  } catch (error) {
    if (
      error instanceof NativeError &&
      error.code === Gtk.DialogError.DISMISSED
    ) {
      return null; // User cancelled - not an error
    }
    throw error; // Actual error
  }
};
```

See [Async Operations](./async-operations.md) for more dialog examples.

## Distinguishing Error Types

Use `instanceof` to distinguish GTKX native errors from JavaScript errors:

```tsx
import { NativeError } from "@gtkx/ffi";

const handleError = (error: unknown) => {
  if (error instanceof NativeError) {
    console.log(`Native: [${error.code}] ${error.message}`);
  } else if (error instanceof Error) {
    console.log(`JS: ${error.message}`);
  }
};
```
