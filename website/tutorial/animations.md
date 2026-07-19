---
description: "Adds a fade to the empty-state placeholder with @gtkx/animated."
---

# Animations

The empty-state placeholder from [The Task List](./the-task-list) mounts as a sibling of the boxed list with no transition, so this chapter fades it in with `@gtkx/animated`.

## Fading the empty state

In `components/task-list.tsx`:

```tsx
import { AnimatePresence, animated } from "@gtkx/animated";

<AnimatePresence initial={false}>
    {tasks.length === 0 ? (
        <animated.AdwStatusPage
            key="empty"
            cssClasses={["compact"]}
            iconName={empty.icon}
            title={empty.title}
            description={empty.description}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={{ duration: 0.2 }}
        />
    ) : null}
</AnimatePresence>
```

The fade is skipped when the system animation setting is off, with no code in the app.

### The constant key

`AnimatePresence` tracks presence by key, and this one is a constant rather than something derived from the `empty` prop. Switching from one empty message to another is then a prop update on the same widget, so typing in the search box while the results stay at zero does not re-fade the placeholder.

### The instant exit

The placeholder sits below the list rather than behind it, so the leave direction zeroes its duration and cuts instead of dissolving under the freshly populated rows.

### Skipping the first paint

`initial={false}` mounts a first-render child directly in its `animate` state, so launching into an empty Trash shows the placeholder without a fade.

## Remounting on navigation

Keying the list by the current view makes a sidebar switch a remount instead of a prop update, so the placeholder of the view you arrive at appears settled. In `app.tsx`:

```tsx
const keyFor = (selection: Selection): string =>
    selection.kind === "list" ? `list-${selection.listId}` : `smart-${selection.view}`;

// ...

<TaskList
    key={keyFor(selection)}
    tasks={visible}
    /* ... */
/>
```

The key covers navigation only, so the search query and the All/Open/Done filter still update the same mounted list.

## What not to animate

- **The natively animated transitions.** `GtkSearchBar`, the selection `GtkActionBar` and `AdwToolbarView` bottom bar, `AdwNavigationView` push and pop, `AdwNavigationSplitView`'s collapse, `AdwToastOverlay` toasts, the `AdwToggleGroup` filter pill, and every Adwaita dialog animate themselves. Wrapping any of them in `animated` fights the built-in transition, and for dialogs and navigation it fights their lifecycle.
- **The task rows.** The `visible` array is rewritten wholesale on every search keystroke, filter toggle, and sort change, so `AnimatePresence` would cascade an enter or exit across the whole list on each of them. Deletions get an undo toast instead.

## Next

Continue to [The Task Editor](/tutorial/the-task-editor).
