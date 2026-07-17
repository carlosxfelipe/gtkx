---
description: "How the Tasks app builds its adaptive frame with AdwApplicationWindow and @gtkx/navigation: a split-view navigator for the panes and a stack navigator for the content."
---

# The Application Shell

Everything the app renders lives inside one `AdwApplicationWindow`. Its body is a navigation tree from `@gtkx/navigation` (see the [Navigation](/guide/navigation) guide). A split-view navigator holds the sidebar and content panes, and the content pane hosts a stack navigator for the list and the task editor. `app.tsx` builds that frame once, and everything the panes show follows from navigation state and React state.

The file is organized around two components. `App` is the exported application root and the home of app-scoped actions; `TasksWindow` is a local component holding the single window and all of the UI state. Everything else in the tutorial hangs off this shell.

## The application root

The outermost element is `<AdwApplication>`. It is a real component from `@gtkx/jsx/adw`, not a wrapper you configure imperatively. Importing the Adwaita bindings runs `adw_init` at module load, which sets up the global `AdwStyleManager`; the component itself starts the `Gtk.Application` when it mounts and provides it to `useApplication()` anywhere in the tree.

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

`actionAccels` binds keyboard accelerators to named actions. These three target window actions, covered in [Actions, Menus, and Shortcuts](/tutorial/actions-menus-shortcuts).

The two `<GSimpleAction>` elements in the application's `actions` slot are mounted on the application itself rather than the window, so they register as **app-scoped** actions (`app.complete-task`, `app.open-task`) through the application's action map. They exist so desktop notification buttons can call back into the app even when no window exists yet, which is why they cannot be `win.`-scoped. Because they live outside `TasksWindow`, they reach its state through the `notify` ref that `App` creates and passes down. [Reminders and Notifications](/tutorial/notifications) covers these actions, their parameter type, and the ref bridge in full.

## The window

`TasksWindow` renders a single `<AdwApplicationWindow>`. This is an Adwaita window: freeform (no separate title bar; the header bars live inside the content), and it takes its child content through the `content` object prop, which the children here route into automatically.

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

A few things to note for a GTK4 newcomer:

- **`ref={windowRef}`** gives you the live `Adw.ApplicationWindow` instance (`useRef<Adw.ApplicationWindow | null>(null)`). It is the target for the window-size bindings below.
- **`widthRequest={360}` and `heightRequest={294}`** set the minimum window size. This is the GNOME phone-form-factor floor: the app is guaranteed to work down to a 360x294 window, which is what forces the layout to prove it collapses gracefully.
- **`breakpoints`** is a slot that attaches an `<AdwBreakpoint>` to the window, covered below.
- **`actions`** and **`controllers`** are `ReactNode` slots. `controllers` is present on every widget; `actions` on anything that is an action map (`Gio.ActionMap`), which includes the application and application windows (`AdwApplicationWindow` / `GtkApplicationWindow`), but not a plain `GtkWindow`. `actions` holds `<GSimpleAction>` elements (here the `win.*` actions the accelerators above target); `controllers` holds event controllers like the global shortcut controller. Both are detailed in [Actions, Menus, and Shortcuts](/tutorial/actions-menus-shortcuts).

### Persisting window size

The window's size is bound to GSettings with `useBindSetting`, which wires a `Gio.Settings` key to a GObject property in both directions:

```tsx
useBindSetting(schema, "window-width", windowRef, "defaultWidth");
useBindSetting(schema, "window-height", windowRef, "defaultHeight");
```

`useBindSetting(schema, key, target, property)` binds the `window-width` setting to the window's `default-width` property (and `window-height` to `default-height`). `schema` is the app's GSettings schema, imported from its gschema XML file and introduced in [Data Model and Persistence](/tutorial/data-and-persistence). On startup the hook seeds the property from the stored value, so the window opens at its last size; while the app runs it writes any change back. Because GTK4 keeps `default-width` and `default-height` at the un-maximized size, the restored size is always the normal window size, never a maximized one. The target is the `windowRef`, which the hook resolves once the window mounts.

That leaves the close handler doing only close-time work: flushing unsaved tasks and quitting.

```tsx
const handleClose = (): boolean => {
    api.flush();
    return quit();
};
```

`onCloseRequest` maps to the GTK4 `close-request` signal. `api.flush()` writes any pending task changes to disk; `api` is the task-store API returned by `useTasks`, covered in the next chapter. `quit()` from `@gtkx/react` unmounts every active render root, which disposes the window and ends the app.

## The toast overlay

Immediately inside the window is an `<AdwToastOverlay>`. It wraps the entire layout and holds nothing of its own except a ref:

```tsx
<AdwToastOverlay ref={toastOverlayRef}>
    {/* the split view */}
</AdwToastOverlay>
```

Toasts are added imperatively, not declaratively: `toastOverlayRef.current?.addToast(Adw.Toast.new(...))`. That is how the undo affordance works: when a task is trashed, the handler builds a toast with an "Undo" button and pushes it onto the overlay. The overlay lives here at the top of the shell so any handler in the window can reach it through the ref. The undo flow itself is covered in [Feedback and Dialogs](/tutorial/feedback-and-dialogs).

## The adaptive split view

The body of the window is a navigation tree rooted in a `NavigationContainer` from `@gtkx/navigation`. Inside it, a split-view navigator renders the adaptive sidebar/content layout. On a wide screen the two panes sit side by side. When collapsed, the layout becomes a single column that navigates between them. The navigator is created once at module level, typed by the routes it holds:

```tsx
type ShellParams = {
    Sidebar: undefined;
    Tasks: NavigatorScreenParams<TasksStackParams> | undefined;
};

const Split = createSplitViewNavigator<ShellParams>();
```

The container wraps the navigator, and the navigator's two screens become the sidebar and content panes:

```tsx
<NavigationContainer ref={navigationRef}>
    <Split.Navigator
        collapsed={collapsed}
        sidebarWidthFraction={0.25}
        minSidebarWidth={220}
        maxSidebarWidth={300}
    >
        <Split.Screen name="Sidebar" options={{ title: "Tasks" }}>
            {() => (
                <AdwToolbarView topBar={<AdwHeaderBar start={<>{/* New List button */}</>} />}>
                    <Sidebar lists={lists} counts={counts} selection={selection} onSelect={selectSidebar} />
                </AdwToolbarView>
            )}
        </Split.Screen>
        <Split.Screen name="Tasks" options={{ title: titleFor(selection, lists) }}>
            {() => <>{/* the tasks stack, covered below */}</>}
        </Split.Screen>
    </Split.Navigator>
</NavigationContainer>
```

The split-view navigator drives a real `Adw.NavigationSplitView`. Each screen's `title` option names its `Adw.NavigationPage`, so the content pane is named "Today", "Important", or a user list's name via `titleFor(selection, lists)`; the list header itself shows the filter toggles as its title widget rather than this text. `sidebarWidthFraction={0.25}` asks for a quarter of the window, clamped between `minSidebarWidth={220}` and `maxSidebarWidth={300}`, both in `sp`, the same text-scaling unit the breakpoint below uses.

Both screens use render callbacks (`{() => ...}`) rather than `component`, because their content closes over `TasksWindow`'s state and handlers.

Adaptivity splits between one controlled prop and navigation state:

- **`collapsed`** decides whether the two panes are side by side (`false`) or stacked into one column (`true`). It is a controlled React prop, driven by the breakpoint below.
- **Which pane is focused is navigation state.** Navigating to the `Tasks` route focuses the content pane, which on a collapsed layout slides it into view. There is no `showContent` state to mirror by hand; see [the split-view navigator](/guide/navigation#the-split-view-navigator) for how widget-driven back and navigation state stay in agreement.

The `navigationRef` on the container comes from `useNavigationContainerRef()`. Handlers that live outside the screens (opening a task from a row, the sidebar's `selectSidebar`, the notification actions) navigate through it:

```tsx
const openTask = (id: string): void => {
    navigationRef.navigate("Tasks", { screen: "Task", params: { id } });
};

const showList = (): void => {
    navigationRef.navigate("Tasks", { screen: "List" });
};
```

`openTask` addresses a screen *inside* the content pane's nested stack (the `{ screen, params }` shape is `NavigatorScreenParams`): one call focuses the content pane and pushes the task page. `selectSidebar` ends with `showList()`, which focuses the content pane on the list; on a collapsed layout that slides the content into view, and if a task page was open it pops back to the list, all from one navigate call.

## The breakpoint

The split view collapses at a threshold, and that threshold is an `AdwBreakpoint`. In plain Adwaita a breakpoint is added to a window and, when its condition matches, emits `apply` / `unapply` (and can apply property setters). GTKX exposes this declaratively: the window's `breakpoints` slot takes one or more `<AdwBreakpoint>` children, each with a `condition` and `onApply` / `onUnapply` handlers.

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

`condition` is parsed once with `Adw.BreakpointCondition.parse`. When the window's width drops below the threshold, `onApply` fires; when it grows back, `onUnapply` fires. Both flip the `collapsed` state, which flows into the split view's `collapsed` prop: Adwaita reports the layout threshold, React owns whether the app is in its collapsed mode.

The condition uses `sp` units rather than raw pixels. `sp` (scale independent pixels) tracks the text scale factor, so the collapse point widens automatically when the user turns on Large Text. Below 500sp the layout goes single-column; above it, side by side.

## The content stack

The content pane hosts a stack navigator. It drives an `AdwNavigationView`: navigating to a route pushes its page with the Adwaita slide animation, going back pops it, and the pushed page gets a back button and an edge-swipe for free. The stack is created at module level next to the split navigator, with the task id as a route param:

```tsx
type TasksStackParams = {
    List: undefined;
    Task: { id: string };
};

const Stack = createStackNavigator<TasksStackParams>();
```

The stack is rendered as the content pane's screen body:

```tsx
<Stack.Navigator>
    <Stack.Screen name="List" options={{ title: titleFor(selection, lists) }}>
        {() => (
            <AdwToolbarView
                topBar={selecting ? selectionHeader : listHeader}
                bottomBar={selecting ? selectionActionBar : undefined}
                revealBottomBars={selecting}
            >
                {listBody}
            </AdwToolbarView>
        )}
    </Stack.Screen>
    <Stack.Screen
        name="Task"
        options={({ route }) => ({
            title: tasks.find((task) => task.id === route.params.id)?.title ?? "Task",
        })}
    >
        {({ route }) => {
            const task = tasks.find((entry) => entry.id === route.params.id);
            if (!task) return null;
            return (
                <AdwToolbarView topBar={<>{/* the detail header */}</>}>
                    <TaskDetail key={task.id} task={task} /* ... */ />
                </AdwToolbarView>
            );
        }}
    </Stack.Screen>
</Stack.Navigator>
```

The two changes the pane can show split cleanly by kind, and that split is the whole point:

- **Opening a task is a drill-down.** The detail view is genuinely deeper than the list, so it is a real route: `navigate("Task", { id })` pushes it, and which task it shows travels in `route.params`, not in shell state. The screen looks its task up from the id; the `options` callback does the same to put the task's title on the page.
- **List versus selection is a mode toggle, not a drill-down.** The batch-select mode shows the same tasks as the plain list, with checkable rows and a different header. It is not deeper, so it stays on one screen (`List`) whose body swaps between `<TaskList>` and `<SelectionView>`. Because the route never changes, that swap is a plain React re-render with zero stack operations. A stack models "deeper", not "a different mode over the same data", so forcing selection mode into a pushed route would be the wrong shape.

Each screen carries its own header inside its `AdwToolbarView`: the list screen picks between `listHeader` and `selectionHeader` from the `selecting` flag, and the task screen builds its header inline from the task it looked up (the Important toggle and Delete button in `end`, with no back button, because the pushed page supplies one). The task screen and its header read the same `route.params.id`, so they can never disagree.

Opening a task is `openTask(id)`; a programmatic back is `navigationRef.goBack()`. Widget-driven pops (the back button, an edge-swipe, or Escape through `AdwNavigationView`'s `popOnEscape`) reduce into navigation state as well, so the route and the widget stack never disagree; [the stack navigator](/guide/navigation#the-stack-navigator) covers that reconciliation. The sidebar-to-content transition when collapsed follows the same principle one level up, through the split-view navigator's focused route.

## Next

Continue to [Data Model and Persistence](/tutorial/data-and-persistence), which introduces the types, the store, and the `useTasks` hook this chapter already leans on.
