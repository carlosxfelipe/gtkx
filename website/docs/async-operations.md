# Async Operations

GTKX works naturally with JavaScript's async/await patterns. This guide covers common async scenarios in GTK applications.

## Basic Patterns

### Async Event Handlers

You can use async functions in event handlers:

```tsx
const handleSave = async () => {
    setLoading(true);
    try {
        await saveDocument();
        showToast("Saved successfully");
    } catch (error) {
        showToast("Save failed");
    } finally {
        setLoading(false);
    }
};

<GtkButton label={loading ? "Saving..." : "Save"} onClicked={handleSave} sensitive={!loading} />
```

### Loading States

Manage loading states with React state:

```tsx
import { useState, useEffect } from "react";

const DataList = () => {
    const [data, setData] = useState<Item[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const items = await fetchItems();
                setData(items);
            } catch (e) {
                setError("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return <GtkSpinner spinning />;
    }

    if (error) {
        return <GtkLabel label={error} cssClasses={["error"]} />;
    }

    return (
        <GtkListBox>
            {data?.map((item) => (
                <GtkLabel key={item.id} label={item.name} />
            ))}
        </GtkListBox>
    );
};
```

## File Operations

### Reading Files

```tsx
import * as Gio from "@gtkx/ffi/gio";

const readFile = async (path: string): Promise<string> => {
    const file = Gio.File.newForPath(path);
    const [contents] = await file.loadContentsAsync(null);
    return new TextDecoder().decode(contents);
};

const FileViewer = () => {
    const [content, setContent] = useState<string | null>(null);
    const app = useApplication();

    const openFile = async () => {
        const dialog = new Gtk.FileDialog();
        try {
            const file = await dialog.open(app.getActiveWindow() ?? undefined);
            const path = file.getPath();
            if (path) {
                const text = await readFile(path);
                setContent(text);
            }
        } catch {
            // User cancelled
        }
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL}>
            <GtkButton label="Open File" onClicked={openFile} />
            {content && <GtkLabel label={content} />}
        </GtkBox>
    );
};
```

### Writing Files

```tsx
import * as Gio from "@gtkx/ffi/gio";

const writeFile = async (path: string, content: string): Promise<void> => {
    const file = Gio.File.newForPath(path);
    const bytes = new TextEncoder().encode(content);
    await file.replaceContentsAsync(bytes, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
};
```

## Network Requests

Use standard `fetch` for HTTP requests:

```tsx
const ApiData = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("https://api.example.com/data");
                const json = await response.json();
                setData(json);
            } catch (error) {
                console.error("Fetch failed:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <GtkSpinner spinning />;
    return <GtkLabel label={JSON.stringify(data)} />;
};
```

## Dialogs

GTK dialogs return promises:

```tsx
const showConfirmDialog = async (): Promise<boolean> => {
    const dialog = new Gtk.AlertDialog();
    dialog.setMessage("Confirm Action");
    dialog.setButtons(["Cancel", "OK"]);
    dialog.setCancelButton(0);
    dialog.setDefaultButton(1);

    try {
        const response = await dialog.choose(window);
        return response === 1;
    } catch {
        return false;
    }
};

const DeleteButton = () => {
    const handleDelete = async () => {
        const confirmed = await showConfirmDialog();
        if (confirmed) {
            await deleteItem();
        }
    };

    return <GtkButton label="Delete" onClicked={handleDelete} cssClasses={["destructive-action"]} />;
};
```

## Debouncing

Debounce rapid updates (e.g., search input):

```tsx
import { useState, useEffect, useRef } from "react";

const SearchInput = ({ onSearch }: { onSearch: (query: string) => void }) => {
    const [query, setQuery] = useState("");
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            onSearch(query);
        }, 300);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [query, onSearch]);

    return (
        <GtkEntry
            text={query}
            onChanged={(entry) => setQuery(entry.getText() ?? "")}
            placeholderText="Search..."
        />
    );
};
```

## Cancellation

Cancel async operations when components unmount:

```tsx
import { useEffect, useState } from "react";

const CancellableRequest = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                const response = await fetch("/api/data", {
                    signal: controller.signal,
                });
                const json = await response.json();
                setData(json);
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    // Request was cancelled, ignore
                    return;
                }
                throw error;
            }
        };

        fetchData();

        return () => controller.abort();
    }, []);

    return <GtkLabel label={data ? JSON.stringify(data) : "Loading..."} />;
};
```

## Polling

Periodically fetch updates:

```tsx
import { useEffect, useState, useRef } from "react";

const PollingData = ({ interval = 5000 }: { interval?: number }) => {
    const [data, setData] = useState(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const response = await fetch("/api/status");
            const json = await response.json();
            setData(json);
            setLastUpdate(new Date());
        };

        fetchData(); // Initial fetch
        const id = setInterval(fetchData, interval);

        return () => clearInterval(id);
    }, [interval]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL}>
            <GtkLabel label={data ? JSON.stringify(data) : "Loading..."} />
            {lastUpdate && <GtkLabel label={`Updated: ${lastUpdate.toLocaleTimeString()}`} cssClasses={["dim-label"]} />}
        </GtkBox>
    );
};
```

## Tips

1. **Always handle errors** — Wrap async operations in try/catch
2. **Show loading states** — Users should know when operations are in progress
3. **Cancel on unmount** — Prevent state updates on unmounted components
4. **Debounce user input** — Avoid excessive API calls on rapid typing
5. **Use finally for cleanup** — Reset loading states regardless of success/failure
