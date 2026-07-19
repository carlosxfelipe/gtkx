---
description: "Stack, tab, drawer and split-view navigation with @gtkx/navigation: React Navigation's model driving Adwaita widgets."
---

# Navigation

`@gtkx/navigation` brings routing to a GTKX app: named screens, typed route params, an imperative `navigate()`, focus-aware hooks, and nested navigators. It is built on `@react-navigation/core`, the platform-agnostic heart of [React Navigation](https://reactnavigation.org), so the mental model (and most of the API) is the one React developers already know from the web and React Native. What GTKX supplies is the view layer: each navigator renders an Adwaita widget and keeps it in lockstep with navigation state.

These navigators ship today:

- **`createStackNavigator`** drives an `Adw.NavigationView`: a page stack with slide animations, an automatic back button, edge-swipe back, and Escape-to-pop.
- **`createSplitViewNavigator`** drives an `Adw.NavigationSplitView`: the adaptive sidebar/content layout that collapses to a single column on narrow windows.
- **`createTabNavigator`** drives an `Adw.ViewStack`: a fixed set of views you switch between, paired with a view switcher you place yourself.
- **`createDrawerNavigator`** drives an `Adw.OverlaySplitView`: a sidebar that is a permanent pane when there is room and an overlay when there is not.

```tsx
import {
    createSplitViewNavigator,
    createStackNavigator,
    NavigationContainer,
    type NavigatorScreenParams,
    type RouteProp,
    useNavigation,
    useNavigationContainerRef,
    useRoute,
} from "@gtkx/navigation";

type TasksStackParams = {
    List: undefined;
    Task: { id: string };
};

const Stack = createStackNavigator<TasksStackParams>();

const TasksStack = () => (
    <Stack.Navigator initialRouteName="List">
        <Stack.Screen name="List" component={ListScreen} options={{ title: "Tasks" }} />
        <Stack.Screen name="Task" component={TaskScreen} />
    </Stack.Navigator>
);
```

Navigators are created once, at module level. The factory returns a `Navigator` component plus the `Screen` and `Group` components used to declare its routes, all typed by the param list you pass. `navigate("Task", { id })` type-checks against `TasksStackParams`, and `useRoute<RouteProp<TasksStackParams, "Task">>()` in the `Task` screen types `params` as `{ id: string }`.

## The container

Every navigation tree lives inside one `NavigationContainer`. It owns the navigation state and delivers it to the navigators below. State-level concerns attach there too: `initialState` to start deep in the app, `onStateChange` to observe transitions, `onReady` to know when the tree is live.

```tsx
const App = () => (
    <NavigationContainer>
        <TasksStack />
    </NavigationContainer>
);
```

To navigate from outside a screen (a window-level action, a notification handler), create a container ref with `useNavigationContainerRef()` and pass it as `ref`. The ref is callable the moment the container reports ready:

```tsx
const navigationRef = useNavigationContainerRef<TasksStackParams>();

<NavigationContainer ref={navigationRef}>{/* ... */}</NavigationContainer>;

navigationRef.navigate("Task", { id });
```

`NavigationContainer` throws when it renders inside another container's React subtree, so what counts as nesting is decided by the React tree, not the widget tree. Windows rendered as siblings under the application each own their tree and need no wrapper.

A window [portaled](/guide/modals-and-portals) from inside a screen is the nested case: portals preserve React context, so the inner container sees the outer one. Wrap the inner container in `NavigationIndependentTree` there. It clears the surrounding navigation context so the inner tree runs on its own, at the cost of being unable to navigate between the two trees.

## The stack navigator

`Stack.Navigator` renders an `Adw.NavigationView` and reconciles the widget's page stack against navigation state. `navigate` and `push` push pages with the Adwaita slide animation, `goBack` and `popTo` pop them, and a state reset replaces the stack wholesale.

The reconciliation runs in both directions. When the **widget** pops a page on its own, the navigator dispatches the matching pop into navigation state. `useNavigationState` and your `onStateChange` handler therefore always agree with what is on screen. Widget-initiated pops cover the header bar's back button, a swipe, <kbd>Escape</kbd>, <kbd>Alt</kbd>+<kbd>←</kbd>, the back mouse button, and the back button's context menu.

Screen options describe the page itself, alongside the [header options](#headers) every navigator screen shares:

- **`title`** sets the `Adw.NavigationPage` title, which the header bar displays and the next page's back button names. It defaults to the route name.
- **`canPop`** set to `false` disables the page's back button, pop gestures, and shortcuts.
- **`presentation`** set to `"modal"` or `"bottomSheet"` presents the route as an `Adw.Dialog` instead of pushing a page. `contentWidth`, `contentHeight` and `followsContentSize` size that dialog and are inert for a plain page.

A modal route never enters the widget's page stack, so the pages beneath it stay exactly as they were. Closing the dialog dispatches the matching pop, and navigating the route away in React dismisses the dialog:

```tsx
<Stack.Screen name="Edit" component={EditScreen} options={{ presentation: "modal", title: "Edit Task" }} />
```

A stack needs at least one route with the default `"page"` presentation, since a dialog has no page to sit on.

Navigator-level props pass straight through to the `AdwNavigationView` widget: `popOnEscape`, `animateTransitions`, sizing, CSS classes, and the `ref` resolves to the live `Adw.NavigationView`.

Screens receive `route` and `navigation` props, or reach the same objects from anywhere in the subtree with hooks:

```tsx
const TaskScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<TasksStackParams, "Task">>();
    const { id } = route.params;
    return <TaskDetail id={id} onDone={() => navigation.goBack()} />;
};
```

A screen that needs data from the component rendering the navigator takes a render callback instead of `component`, closing over whatever it needs:

```tsx
<Stack.Screen name="List" options={{ title: titleFor(selection) }}>
    {() => <TaskList tasks={visible} onOpen={(id) => navigationRef.navigate("Task", { id })} />}
</Stack.Screen>
```

## Headers

Screens of a stack, split-view or drawer navigator get an Adwaita header bar from the navigator, so a screen renders its content and describes its chrome through options. A stack page's back button appears in that header automatically.

- **`headerTitle`** and **`headerSubtitle`** set the header's `Adw.WindowTitle`. `headerTitle` falls back to `title`, which falls back to the route name.
- **`headerLeft`** and **`headerRight`** pack widgets at the start and end of the header bar.
- **`headerSearchBar`** adds a second top bar below the header bar, where a `GtkSearchBar` belongs.
- **`headerTransparent`** extends the screen's content under the header bar, and **`headerShadowVisible`** picks a raised or flat top bar.
- **`headerBackVisible`** set to `false` hides a page's back button while leaving pop gestures and shortcuts alone, which is what `canPop` disables.

```tsx
<Stack.Screen
    name="Task"
    component={TaskScreen}
    options={{
        title: task.title,
        headerRight: <GtkButton iconName="user-trash-symbolic" onClicked={() => remove(task)} />,
    }}
/>
```

`header` supplies the top bar itself, for chrome the options do not describe: a custom title widget, hidden window controls, an `AdwHeaderBar` configured any way you like.

```tsx
options={{ header: <AdwHeaderBar titleWidget={<FilterToggle filter={filter} onChange={setFilter} />} /> }}
```

`headerShown: false` renders the screen's content bare. A screen hosting a nested navigator wants that, since the inner navigator's screens bring their own headers:

```tsx
<Split.Screen name="Tasks" component={TasksStack} options={{ headerShown: false }} />
```

Header appearance is CSS: style classes and [`@gtkx/css`](/guide/css-and-animations) reach the header bar and its contents.

Tab screens have no header options, because an `Adw.ViewStack` is switched from a single header bar above it rather than one header per page.

## The split-view navigator

`Split.Navigator` renders an `Adw.NavigationSplitView` and takes exactly two screens: the first is the sidebar, the second is the content. Unlike a stack, both screens render at all times, side by side when expanded. That is why the navigator is backed by React Navigation's tab router rather than its stack router: navigation state tracks which pane is *focused*, not which pages are piled up. The focused pane is also the one a collapsed split view shows.

```tsx
type ShellParams = {
    Sidebar: undefined;
    Tasks: NavigatorScreenParams<TasksStackParams> | undefined;
};

const Split = createSplitViewNavigator<ShellParams>();

<Split.Navigator collapsed={collapsed} sidebarWidthFraction={0.25}>
    <Split.Screen name="Sidebar" component={Sidebar} options={{ title: "Tasks" }} />
    <Split.Screen name="Tasks" component={TasksStack} />
</Split.Navigator>;
```

`navigate("Tasks")` focuses the content pane; on a collapsed layout that slides it into view (the widget's `show-content`). The widget's own back motion (the back button or a swipe while collapsed) dispatches back to the sidebar route. `goBack()` from the content does the same, because the router's back behavior is pinned to the initial route. `collapsed` stays a controlled prop: the app decides when the layout collapses, typically from an `AdwBreakpoint`, and the navigator follows. All other `AdwNavigationSplitView` props pass through, and each pane is an `Adw.NavigationPage` carrying its own title and [header](#headers).

Nesting follows React Navigation's standard shape: render a stack navigator as the content screen and address its screens through `NavigatorScreenParams`:

```tsx
navigationRef.navigate("Tasks", { screen: "Task", params: { id } });
```

That one call focuses the content pane *and* pushes the task page in its stack. Note the focus semantics on an expanded layout: both panes are visible, but only the focused route is "focused" in navigation terms, which is what `useIsFocused` and the `focus`/`blur` events report.

## The tab navigator

`Tab.Navigator` renders an `Adw.ViewStack`, one page per screen, and binds the visible page to the focused route. Every screen stays realized, so switching tabs preserves scroll position and widget state. It runs on React Navigation's tab router, and `backBehavior` is yours to pick: the router's default `"firstRoute"` sends `goBack()` to the first tab, `"history"` walks back through the tabs you visited, `"none"` ignores it.

```tsx
const Tab = createTabNavigator<ShellParams>();

<Tab.Navigator backBehavior="history">
    <Tab.Screen name="Inbox" component={Inbox} options={{ title: "Inbox", iconName: "mail-symbolic", badgeNumber: unread }} />
    <Tab.Screen name="Settings" component={Settings} options={{ title: "Settings", iconName: "preferences-system-symbolic" }} />
</Tab.Navigator>;
```

The switcher is not part of the navigator, because an `AdwViewSwitcher` belongs in a header bar and an `AdwViewSwitcherBar` in a toolbar, both above the navigator in the tree. Hold the stack in state and hand it to whichever switcher you want:

```tsx
const [stack, setStack] = useState<Adw.ViewStack | null>(null);

<AdwToolbarView topBar={<AdwHeaderBar titleWidget={<AdwViewSwitcher stack={stack} />} />}>
    <Tab.Navigator ref={setStack}>{/* ... */}</Tab.Navigator>
</AdwToolbarView>;
```

Clicking the switcher moves navigation state, and `navigate()` moves the switcher. Screen options map onto the `Adw.ViewStackPage`: `title`, `iconName`, `badgeNumber`, and `needsAttention`.

## The drawer navigator

`Drawer.Navigator` renders an `Adw.OverlaySplitView`. Every screen is a content screen, and the drawer itself is a `drawerContent` render prop rather than a screen, because drawer status is orthogonal to which route is focused: the drawer can be open or closed over any route.

```tsx
const Drawer = createDrawerNavigator<MailParams>();

<Drawer.Navigator
    collapsed={collapsed}
    drawerContent={({ navigation, state }) => <MailSidebar navigation={navigation} state={state} />}
>
    <Drawer.Screen name="Inbox" component={Inbox} />
    <Drawer.Screen name="Archive" component={Archive} />
</Drawer.Navigator>;
```

While the view is uncollapsed the sidebar is a permanent pane and drawer status is idle. While it is collapsed the sidebar becomes an overlay driven by that status: `navigation.openDrawer()`, `closeDrawer()` and `toggleDrawer()` move it, navigating to another route closes it, and `goBack()` closes it before it touches the route. Drive `collapsed` from an `AdwBreakpoint` and the navigator follows the widget, including collapses the widget performs on its own.

`useDrawerStatus()` reports the router's status. That status stays `"closed"` while an uncollapsed sidebar is on screen, which is the honest answer for a permanent pane; drawer content that needs to tell the two apart reads `collapsed` from its props. Content screens all live in an Adwaita view stack, so they stay mounted as you move between them. Each one carries a [header](#headers); the sidebar toggle that reveals a collapsed drawer goes in its `headerLeft`.

## Deep linking

`NavigationContainer` takes a `linking` prop that maps URIs onto navigation state:

```tsx
<NavigationContainer
    linking={{ config: { screens: { List: "list", Task: "tasks/:id" } } }}
    fallback={<AdwSpinner />}
>
```

`prefixes` defaults to your application ID as a scheme, lowercased: an app with the ID `com.example.Tasks` answers `com.example.tasks://`. That is the reverse-DNS private-use scheme [RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252) recommends for native apps, and it is already unique because application IDs are. Set `prefixes` explicitly to answer something else, such as a hosted `https://` address alongside the custom scheme. An application ID containing an underscore has no default, because GLib permits underscores in application IDs and RFC 3986 forbids them in a scheme; those apps must pass `prefixes` themselves.

A URI present at launch resolves into `initialState` before the tree mounts, so the app opens directly on the linked route with no visible redirect. URIs that arrive later, from a second launch of the same application ID, come through `Gio.Application`'s `open` signal and are dispatched into the live tree. Give the application `Gio.ApplicationFlags.HANDLES_OPEN` for that path to work, and claim the scheme in your [`.desktop` entry](/tutorial/packaging).

A desktop app has no address bar, so the reverse direction is a hook rather than an automatic write: `useLinkPath()` gives the path for the focused route and `useLinkURL()` prefixes it with `prefixes[0]`. Use them to build a "copy link" action or a window subtitle.

## Hooks

`@gtkx/navigation` re-exports the React Navigation core hooks:

- **`useNavigation()`** returns the navigation object for the enclosing screen: `navigate`, `goBack`, `setParams`, `setOptions`, and event subscription via `addListener`. Type it as `useNavigation<StackNavigationProp<TasksStackParams>>()` to reach the stack helpers like `push` and `popTo`, or as `SplitViewNavigationProp` to reach `jumpTo`.
- **`useRoute()`** returns the screen's route, including `params`.
- **`useNavigationState(selector)`** subscribes to a slice of the navigator's state.
- **`useIsFocused()`** and **`useFocusEffect(callback)`** track whether the screen is the focused one, re-running the effect on focus and cleaning up on blur.
- **`usePreventRemove(shouldPrevent, callback)`** marks the screen as not removable while a condition holds (unsaved changes, a running operation).
- **`useDrawerStatus()`** reports whether the enclosing drawer navigator is open or closed.
- **`useLinkPath()`** and **`useLinkURL()`** render the focused route back into a path or a full URI.

`CommonActions`, `StackActions`, and `TabActions` are also re-exported for dispatching raw actions through `navigation.dispatch` or a container ref.

## Preventing removal

`usePreventRemove(true, onAttempt)` guards removal on a stack screen. It sets the page's `canPop` to `false`, so the back button disappears and the pop gesture and shortcuts are disabled up front. If the page is popped anyway, because something called `pop()` on the widget directly, the navigator's dispatched pop is prevented. The `onAttempt` callback fires with the blocked action. The navigator then pushes the page straight back, so navigation state wins.

What it cannot do on a page is Adwaita's "ask first, then maybe close" flow, because `Adw.NavigationView` has no vetoable pop: `can-pop` is consulted inside GTK, which swallows the gesture without telling anyone, and the `popped` signal arrives only after a page is gone. Prevention for widget-initiated pops is therefore block-up-front, not intercept-in-flight.

A route presented as a modal does deliver the full flow, because `Adw.Dialog` is vetoable: the guarded route keeps `can-close` false, the dialog's close attempt fires your callback, and you answer with a confirmation before dispatching the pop yourself.

## What belongs in navigation state

Navigation state (which page is open, which pane is focused) belongs to the navigators. App data referenced by routes travels in **params**: a task editor screen receives `{ id }` and looks the task up, rather than the shell hoisting a `selectedTask` into its own state. The [tutorial's application shell](/tutorial/app-shell) builds a complete adaptive app this way: a split-view navigator for the sidebar and content, a stack navigator inside the content pane, and a container ref for window-level actions.

## Next

[CSS and Animations](/guide/css-and-animations) covers styling these surfaces and animating the state changes the navigators do not animate for you.
