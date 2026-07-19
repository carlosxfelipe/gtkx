---
description: "How the Tasks app builds its adaptive frame with AdwApplicationWindow and @gtkx/navigation: a split-view navigator for the panes and a stack navigator for the content."
---

# The Application Shell

`app.tsx` builds the window, a split-view navigator for the sidebar and content panes, and a stack navigator inside the content pane.

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
        controllers={<AppShortcuts /* Ctrl+F, Escape */ />}
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
    <NavigationContainer ref={navigationRef}>
        <Split.Navigator
            collapsed={collapsed}
            sidebarWidthFraction={0.25}
            minSidebarWidth={220}
            maxSidebarWidth={300}
        >
            <Split.Screen
                name="Sidebar"
                options={{ title: "Tasks", headerLeft: <>{/* New List button */}</> }}
            >
                {() => <Sidebar lists={lists} counts={counts} selection={selection} onSelect={selectSidebar} />}
            </Split.Screen>
            <Split.Screen name="Tasks" options={{ title: titleFor(selection, lists), headerShown: false }}>
                {() => <>{/* the tasks stack, covered below */}</>}
            </Split.Screen>
        </Split.Navigator>
    </NavigationContainer>
</AdwToastOverlay>
```

The `<AdwToastOverlay>` wrapping the tree is where the undo toasts in [Feedback and Dialogs](/tutorial/feedback-and-dialogs) land. `titleFor(selection, lists)` names the content pane "Today", "Important", or a user list's name, while the list header shows the filter toggles as its title widget.

Each navigator screen gets its [header](/guide/navigation#headers) from the navigator, so the sidebar declares its New List button as `headerLeft` and renders only the sidebar itself. The content pane sets `headerShown: false` because it hosts the tasks stack, whose own screens bring the headers.

```tsx
const openTask = (id: string): void => {
    navigationRef.navigate("Tasks", { screen: "Task", params: { id } });
};

const showList = (): void => {
    navigationRef.navigate("Tasks", { screen: "List" });
};
```

`selectSidebar` ends with `showList()`, so selecting a sidebar row focuses the content pane and pops any open editor back to the list.

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

The condition uses `sp` (scale independent pixels), which tracks the text scale factor, so the collapse point widens automatically when the user turns on Large Text.

### The content stack

```tsx
<Stack.Navigator>
    <Stack.Screen
        name="List"
        options={{
            title: titleFor(selection, lists),
            header: selecting ? selectionHeader : listHeader,
        }}
    >
        {() => (
            <AdwToolbarView bottomBar={selectionActionBar} revealBottomBars={selecting}>
                {listBody}
            </AdwToolbarView>
        )}
    </Stack.Screen>
    <Stack.Screen name="Task" options={taskOptions}>
        {({ route }) => {
            const task = findTask(route.params.id);
            if (!task) return null;
            return (
                <GtkBox orientation={Gtk.Orientation.VERTICAL} vexpand controllers={<>{/* the Delete shortcut */}</>}>
                    <TaskDetail key={task.id} task={task} /* ... */ />
                </GtkBox>
            );
        }}
    </Stack.Screen>
</Stack.Navigator>
```

Opening a task is a drill-down onto the `Task` route, while list versus selection is a mode toggle: the batch-select mode stays on the `List` screen, whose body swaps between `<TaskList>` and `<SelectionView>`. The list screen has a title widget of its own, so it hands the navigator a whole header bar through the `header` option and picks between `listHeader` and `selectionHeader` from the `selecting` flag. Its `AdwToolbarView` is left holding the selection action bar, which reveals under the body. The task screen builds its header from options instead, covered in [The Task Editor](/tutorial/the-task-editor).

## Next

Continue to [Data Model and Persistence](/tutorial/data-and-persistence).
