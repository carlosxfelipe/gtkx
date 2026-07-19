---
description: "How the Tasks app builds its adaptive frame: an AdwApplicationWindow, an AdwNavigationSplitView for the sidebar and content panes, and a breakpoint that collapses them."
---

# The Application Shell

`app.tsx` builds the window and the split view that holds the sidebar and the content pane.

## The application root

The outermost element is `<AdwApplication>`, which starts the `Gtk.Application` when it mounts and provides it to `useApplication()` anywhere in the tree.

```tsx
export function App() {
    const notify = useRef<NotifyHandlers>({ complete: () => {}, open: () => {} });
    return (
        <AdwApplication
            actionAccels={[
                { detailedActionName: "win.new", accels: ["<Control>n"] },
                { detailedActionName: "win.preferences", accels: ["<Control>comma"] },
                { detailedActionName: "win.shortcuts", accels: ["<Control>question"] },
            ]}
            actions={<>{/* app.complete-task and app.open-task GSimpleActions, wired through the notify ref */}</>}
        >
            <TasksWindow notify={notify} />
        </AdwApplication>
    );
}
```

The accelerators target window actions, covered in [Actions, Menus, and Shortcuts](/tutorial/actions-menus-shortcuts); the actions in this slot are app-scoped and belong to [Reminders and Notifications](/tutorial/notifications).

## The window

`TasksWindow` renders a single `<AdwApplicationWindow>`, an Adwaita freeform window whose header bars live inside the content.

```tsx
return (
    <AdwApplicationWindow
        ref={windowRef}
        title="Tasks"
        widthRequest={360}
        heightRequest={294}
        onCloseRequest={handleClose}
        breakpoints={<>{/* an <AdwBreakpoint> that collapses the layout, shown below */}</>}
        actions={<WindowActions /* new, select, preferences, shortcuts, about */ />}
        controllers={<AppShortcuts /* Ctrl+F, Escape, Delete */ />}
    >
        {/* ...toast overlay + split view... */}
    </AdwApplicationWindow>
);
```

`widthRequest={360}` and `heightRequest={294}` set the GNOME phone-form-factor floor, which forces the layout to prove it collapses gracefully. The `actions`, `controllers`, and `breakpoints` props are `ReactNode` slots, holding `<GSimpleAction>` elements, event controllers, and `<AdwBreakpoint>` children respectively.

### Persisting window size

```tsx
useBindSetting(schema, "window-width", windowRef, "defaultWidth");
useBindSetting(schema, "window-height", windowRef, "defaultHeight");
```

The window size is persisted to GSettings and restored on startup, so the close handler only does close-time work.

```tsx
const handleClose = (): boolean => {
    api.flush();
    return quit();
};
```

`api.flush()` writes pending task changes to disk, and `quit()` from `@gtkx/react` unmounts every active render root, which disposes the window and ends the app.

## The navigation tree

### The adaptive split view

```tsx
<AdwToastOverlay ref={toastOverlayRef}>
    <AdwNavigationSplitView
        collapsed={collapsed}
        showContent={showContent}
        onNotifyShowContent={(value) => setShowContent(value ?? false)}
        sidebarWidthFraction={0.25}
        minSidebarWidth={220}
        maxSidebarWidth={300}
        sidebar={
            <AdwNavigationPage title="Tasks">
                <AdwToolbarView topBar={<AdwHeaderBar start={<GtkButton /* New List */ />} />}>
                    <Sidebar lists={lists} counts={counts} selection={selection} onSelect={selectSidebar} />
                </AdwToolbarView>
            </AdwNavigationPage>
        }
        content={
            <AdwNavigationPage title={titleFor(selection, lists)}>
                {/* ...the content pane, shown below... */}
            </AdwNavigationPage>
        }
    />
</AdwToastOverlay>
```

The `<AdwToastOverlay>` wrapping the tree is where the undo toasts in [Feedback and Dialogs](/tutorial/feedback-and-dialogs) land. `sidebar` and `content` each take an `<AdwNavigationPage>`, the unit Adwaita treats as one pane: a title plus the widget that fills it. `titleFor(selection, lists)` names the content page after whatever the sidebar has selected, a smart view or a user list.

An `<AdwNavigationPage>` carries no header bar of its own, so each pane wraps its body in an `<AdwToolbarView>` and supplies its own `<AdwHeaderBar>` as `topBar`. The sidebar's holds the New List button. The width props keep the sidebar at a quarter of the window, clamped between 220 and 300 pixels.

### The breakpoint

```tsx
<AdwApplicationWindow
    ref={windowRef}
    /* ... */
    breakpoints={
        <AdwBreakpoint
            condition={Adw.BreakpointCondition.parse("max-width: 500sp")}
            onApply={() => setCollapsed(true)}
            onUnapply={() => setCollapsed(false)}
        />
    }
>
```

The condition uses `sp` (scale independent pixels), which tracks the text scale factor, so the collapse point widens automatically when the user turns on Large Text. `collapsed` flows straight into the split view: wide windows show both panes side by side, and narrow ones show one at a time.

### Showing the content pane

When the split view is collapsed, `showContent` decides which pane is on screen, and the split view reports its own changes back through `onNotifyShowContent`, so the header bar's back button and a system back gesture both land in React state.

```tsx
const openTask = (id: string): void => {
    setSelectedTaskId(id);
    if (collapsed) setShowContent(true);
};
```

`selectSidebar` ends the same way, so picking a list on a narrow window slides over to the tasks. On a wide window `collapsed` is `false` and both panes stay visible, so neither call has to touch `showContent`.

### The content pane

```tsx
<AdwNavigationPage title={titleFor(selection, lists)}>
    {selectedTask ? (
        <AdwToolbarView topBar={detailHeader}>
            <TaskDetail key={selectedTask.id} task={selectedTask} /* ... */ />
        </AdwToolbarView>
    ) : (
        <AdwToolbarView
            topBar={selecting ? selectionHeader : listHeader}
            bottomBar={selectionActionBar}
            revealBottomBars={selecting}
        >
            {listBody}
        </AdwToolbarView>
    )}
</AdwNavigationPage>
```

`selectedTask`, looked up from `selectedTaskId`, is what the pane branches on. With a task open it renders the editor under `detailHeader`, whose `go-previous-symbolic` button clears `selectedTaskId` and returns to the list, alongside the star toggle and the delete button. Otherwise it renders the list, and list versus selection is a mode toggle: `listBody` swaps between `<TaskList>` and `<SelectionView>` while the header swaps between `listHeader`, which carries the filter toggles as its title widget, and `selectionHeader`. That `AdwToolbarView` also holds the selection action bar, which reveals under the body. The editor itself is covered in [The Task Editor](/tutorial/the-task-editor).

Escape and Delete come from `<AppShortcuts>` on the window: Escape leaves selection mode or closes the open task, and Delete deletes it.

## Next

Continue to [Data Model and Persistence](/tutorial/data-and-persistence).
