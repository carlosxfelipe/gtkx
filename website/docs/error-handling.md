# Error Handling

This guide covers error handling patterns in GTKX applications.

## Try/Catch in Event Handlers

Always wrap async operations:

```tsx
const handleSave = async () => {
    try {
        await saveDocument();
        showToast("Saved successfully");
    } catch (error) {
        console.error("Save failed:", error);
        showToast("Failed to save document");
    }
};
```

## Error States in Components

Track errors with React state:

```tsx
import { useState, useEffect } from "react";

const DataLoader = () => {
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const result = await fetchData();
                setData(result);
                setError(null);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return <GtkSpinner spinning />;
    }

    if (error) {
        return (
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} valign={Gtk.Align.CENTER}>
                <GtkLabel label="Error" cssClasses={["title-2", "error"]} />
                <GtkLabel label={error} cssClasses={["dim-label"]} />
                <GtkButton label="Retry" onClicked={() => { setLoading(true); setError(null); }} />
            </GtkBox>
        );
    }

    return <DataView data={data} />;
};
```

## Dialog Errors

File and alert dialogs throw when cancelled:

```tsx
const openFile = async () => {
    const dialog = new Gtk.FileDialog();

    try {
        const file = await dialog.open(window);
        const path = file.getPath();
        if (path) {
            processFile(path);
        }
    } catch (error) {
        // User cancelled - this is expected, not an error
        console.log("File dialog cancelled");
    }
};
```

Distinguish between user cancellation and actual errors:

```tsx
const saveWithDialog = async () => {
    const dialog = new Gtk.FileDialog();
    dialog.setInitialName("document.txt");

    try {
        const file = await dialog.save(window);
        await writeToFile(file.getPath());
    } catch (error) {
        // Check if it's a cancellation vs actual error
        if (error instanceof Error && error.message.includes("cancelled")) {
            return; // User cancelled, do nothing
        }
        // Real error - show to user
        showErrorDialog("Failed to save file", error);
    }
};
```

## Toast Notifications

Show non-blocking errors with toasts:

```tsx
import * as Adw from "@gtkx/ffi/adw";
import { useRef } from "react";

const AppWithToasts = () => {
    const toastOverlayRef = useRef<Adw.ToastOverlay | null>(null);

    const showError = (message: string) => {
        if (toastOverlayRef.current) {
            const toast = new Adw.Toast({ title: message });
            toast.setTimeout(5);
            toastOverlayRef.current.addToast(toast);
        }
    };

    const handleAction = async () => {
        try {
            await riskyOperation();
        } catch (error) {
            showError("Operation failed. Please try again.");
        }
    };

    return (
        <AdwToastOverlay ref={toastOverlayRef}>
            <GtkButton label="Do Something" onClicked={handleAction} />
        </AdwToastOverlay>
    );
};
```

## Alert Dialogs for Critical Errors

Use alert dialogs for errors that require user acknowledgment:

```tsx
const showErrorDialog = async (title: string, detail: string) => {
    const dialog = new Gtk.AlertDialog();
    dialog.setMessage(title);
    dialog.setDetail(detail);
    dialog.setButtons(["OK"]);
    dialog.setDefaultButton(0);

    try {
        await dialog.choose(window);
    } catch {
        // Dialog dismissed
    }
};

const criticalOperation = async () => {
    try {
        await performCriticalTask();
    } catch (error) {
        await showErrorDialog(
            "Critical Error",
            error instanceof Error ? error.message : "An unexpected error occurred"
        );
    }
};
```

## Validation Errors

Show inline validation feedback:

```tsx
const FormWithValidation = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);

    const validate = (value: string) => {
        if (!value.includes("@")) {
            setError("Please enter a valid email address");
            return false;
        }
        setError(null);
        return true;
    };

    const handleSubmit = () => {
        if (validate(email)) {
            submitForm(email);
        }
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            <GtkEntry
                text={email}
                onChanged={(entry) => {
                    const value = entry.getText() ?? "";
                    setEmail(value);
                    if (error) validate(value);
                }}
                cssClasses={error ? ["error"] : []}
            />
            {error && <GtkLabel label={error} cssClasses={["error", "caption"]} />}
            <GtkButton label="Submit" onClicked={handleSubmit} cssClasses={["suggested-action"]} />
        </GtkBox>
    );
};
```

## Global Error Handling

Catch unhandled promise rejections:

```tsx
// In your app entry point
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason);
    // Log to error reporting service
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Log to error reporting service
});
```

## Error Logging

Create a logging utility:

```tsx
const logger = {
    error: (message: string, error?: unknown) => {
        console.error(`[ERROR] ${message}`, error);
        // Send to error reporting service in production
    },
    warn: (message: string) => {
        console.warn(`[WARN] ${message}`);
    },
    info: (message: string) => {
        console.log(`[INFO] ${message}`);
    },
};

// Usage
const handleOperation = async () => {
    try {
        await riskyOperation();
    } catch (error) {
        logger.error("Operation failed", error);
        showUserError("Something went wrong");
    }
};
```

## Best Practices

1. **Never swallow errors silently** — At minimum, log them
2. **Show user-friendly messages** — Don't expose technical details
3. **Distinguish recoverable vs fatal errors** — Toasts for minor, dialogs for critical
4. **Provide retry options** — Let users try again when appropriate
5. **Log errors for debugging** — Include stack traces and context
6. **Handle cancellation gracefully** — Dialog cancellation isn't an error
7. **Validate early** — Check inputs before making async calls
