---
description: "An AdwPreferencesDialog bound two-way to GSettings keys, plus Adwaita color schemes applied through Adw.StyleManager."
---

# Preferences and Theming

`components/preferences.tsx` renders the dialog behind `<Control>comma`: a theme picker, a default sort order, and the reminder lead time, each bound to a GSettings key.

```tsx
import { DropDown } from "@gtkx/components";
import { Dialog } from "@gtkx/components/adw";
import { AdwComboRow, AdwPreferencesDialog, AdwPreferencesGroup, AdwPreferencesPage, AdwSpinRow } from "@gtkx/jsx/adw";
import { GtkAdjustment } from "@gtkx/jsx/gtk";
import { useSetting } from "@gtkx/react";
import schema from "#data/com.gtkx.tutorial.gschema.xml";

export const Preferences = ({ onClose }: { onClose: () => void }) => {
    // ...
    return (
        <Dialog component={AdwPreferencesDialog} onClose={onClose} title="Preferences">
            <AdwPreferencesPage title="General" iconName="preferences-system-symbolic">
                <AdwPreferencesGroup title="Appearance">
                    <DropDown
                        component={AdwComboRow}
                        title="Theme"
                        items={[
                            { id: "default", value: "Follow system" },
                            { id: "light", value: "Light" },
                            { id: "dark", value: "Dark" },
                        ]}
                        selectedId={scheme}
                        onSelectionChanged={(id) => {
                            if (isScheme(id)) setScheme(id);
                        }}
                    />
                </AdwPreferencesGroup>
                <AdwPreferencesGroup title="Tasks">
                    <DropDown component={AdwComboRow} title="Sort order" /* ... */ />
                    <AdwSpinRow
                        title="Reminder lead time"
                        subtitle="Minutes before a task is due"
                        adjustment={<GtkAdjustment value={reminderMinutes} lower={0} upper={1440} stepIncrement={5} />}
                        onNotifyValue={(value) => setReminderMinutes(value ?? 30)}
                    />
                </AdwPreferencesGroup>
            </AdwPreferencesPage>
        </Dialog>
    );
};
```

Mounting `<Dialog>` presents the `AdwPreferencesDialog` on the parent window, and dismissing it calls `onClose`, which unmounts `<Preferences>`. See [how a dialog gets on screen](/tutorial/feedback-and-dialogs#how-a-dialog-gets-on-screen).

## Two-way binding with useSetting

```tsx
const [scheme, setScheme] = useSetting(schema, "color-scheme");
const [sortOrder, setSortOrder] = useSetting(schema, "sort-order");
const [reminderMinutes, setReminderMinutes] = useSetting(schema, "reminder-minutes");
```

The tuple reads live and persists on write: `setScheme("dark")` goes straight to GSettings, and every component reading the key re-renders.

```tsx
type Scheme = "default" | "light" | "dark";
const isScheme = (value: string): value is Scheme => value === "default" || value === "light" || value === "dark";
```

Constrained string keys arrive as a literal union from [codegen](/tutorial/data-and-persistence#the-other-store-gsettings-for-ui-preferences), so the guard narrows the combo row's bare `string` back into it. The `sort-order` row follows the same pattern with `isSort`. Notify handlers hand back `value | null`, hence the `value ?? 30` before writing the integer setting.

## Applying the color scheme

`theme.ts` sets the scheme on the process-wide default manager rather than on a rendered element:

```ts
import * as Adw from "@gtkx/gi/adw";

export const applyColorScheme = (value: string): void => {
    const manager = Adw.StyleManager.getDefault();
    const scheme =
        value === "light"
            ? Adw.ColorScheme.FORCE_LIGHT
            : value === "dark"
              ? Adw.ColorScheme.FORCE_DARK
              : Adw.ColorScheme.DEFAULT;
    manager.setColorScheme(scheme);
};
```

`app.tsx` reads the same key and re-applies it:

```tsx
const [colorScheme] = useSetting(schema, "color-scheme");

useEffect(() => {
    applyColorScheme(colorScheme);
}, [colorScheme]);
```

Picking a theme in the dialog changes `colorScheme` here, so the effect re-runs and Adwaita swaps the palette.

## Next

Continue to [Reminders and Notifications](/tutorial/notifications), where `reminder-minutes` drives desktop notifications.
