---
description: "Stack and split-view navigation with @gtkx/navigation: React Navigation's model driving Adw.NavigationView and Adw.NavigationSplitView."
---

# Navigation

`@gtkx/navigation` gives a GTKX app real routing: named screens, typed route params, an imperative `navigate()`, focus-aware hooks, and nested navigators. It is built on `@react-navigation/core`, the platform-agnostic heart of [React Navigation](https://reactnavigation.org), so the mental model (and most of the API) is the one React developers already know from the web and React Native. What GTKX supplies is the view layer: each navigator renders a real Adwaita widget and keeps it in lockstep with navigation state.

Two navigators ship today:

- **`createStackNavigator`** drives an `Adw.NavigationView`: a page stack with slide animations, an automatic back button, edge-swipe back, and Escape-to-pop.
- **`createSplitViewNavigator`** drives an `Adw.NavigationSplitView`: the adaptive sidebar/content layout that collapses to a single column on narrow windows.

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

Navigators are created once, at module level. The factory returns a `Navigator` component plus the `Screen` and `Group` components used to declare its routes, all typed by the param list you pass: `navigate("Task", { id })` type-checks against `TasksStackParams`, and `useRoute<RouteProp<TasksStackParams, "Task">>()` in the `Task` screen types `params` as `{ id: string }`.

## The container

Every navigation tree lives inside one `NavigationContainer`. It owns the navigation state, delivers it to the navigators below, and is where state-level concerns attach: `initialState` to start deep in the app, `onStateChange` to observe transitions, `onReady` to know when the tree is live.

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

Screen options are deliberately small, because Adwaita pages own their chrome:

- **`title`** sets the `Adw.NavigationPage` title, which the header bar displays and the next page's back button names. It defaults to the route name.
- **`canPop`** set to `false` disables the page's back button, pop gestures, and shortcuts.

There is no navigator-owned header. Each screen composes its own `AdwToolbarView` with an `AdwHeaderBar`, exactly as it would anywhere else in GTKX; the pushed page's back button appears in it automatically. Navigator-level props pass straight through to the `AdwNavigationView` widget: `popOnEscape`, `animateTransitions`, sizing, CSS classes, and the `ref` resolves to the live `Adw.NavigationView`.

Screens receive `route` and `navigation` props, or reach the same objects from anywhere in the subtree with hooks:

```tsx
const TaskScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<TasksStackParams, "Task">>();
    const { id } = route.params;
    return (
        <AdwToolbarView topBar={<AdwHeaderBar />}>
            <TaskDetail id={id} onDone={() => navigation.goBack()} />
        </AdwToolbarView>
    );
};
```

A screen that needs data from the component rendering the navigator takes a render callback instead of `component`, closing over whatever it needs:

```tsx
<Stack.Screen name="List" options={{ title: titleFor(selection) }}>
    {() => <TaskList tasks={visible} onOpen={(id) => navigationRef.navigate("Task", { id })} />}
</Stack.Screen>
```

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

`navigate("Tasks")` focuses the content pane; on a collapsed layout that slides it into view (the widget's `show-content`). The widget's own back motion (the back button or a swipe while collapsed) dispatches back to the sidebar route, and `goBack()` from the content returns to the sidebar, because the router's back behavior is pinned to the initial route. `collapsed` stays a controlled prop: the app decides when the layout collapses, typically from an `AdwBreakpoint`, and the navigator follows. All other `AdwNavigationSplitView` props (`sidebarWidthFraction`, `minSidebarWidth`, `maxSidebarWidth`, `sidebarPosition`, and the rest) pass through, and each pane's `Adw.NavigationPage` title comes from the screen's `title` option.

Nesting follows React Navigation's standard shape: render a stack navigator as the content screen and address its screens through `NavigatorScreenParams`:

```tsx
navigationRef.navigate("Tasks", { screen: "Task", params: { id } });
```

That one call focuses the content pane *and* pushes the task page in its stack. Note the focus semantics on an expanded layout: both panes are visible, but only the focused route is "focused" in navigation terms, which is what `useIsFocused` and the `focus`/`blur` events report.

## Hooks

`@gtkx/navigation` re-exports the React Navigation core hooks:

- **`useNavigation()`** returns the navigation object for the enclosing screen: `navigate`, `goBack`, `setParams`, `setOptions`, and event subscription via `addListener`. Type it as `useNavigation<StackNavigationProp<TasksStackParams>>()` to reach the stack helpers (`push`, `pop`, `popTo`, `popToTop`, `replace`), or as `SplitViewNavigationProp` to reach `jumpTo`.
- **`useRoute()`** returns the screen's route, including `params`.
- **`useNavigationState(selector)`** subscribes to a slice of the navigator's state.
- **`useIsFocused()`** and **`useFocusEffect(callback)`** track whether the screen is the focused one, re-running the effect on focus and cleaning up on blur.
- **`usePreventRemove(shouldPrevent, callback)`** marks the screen as not removable while a condition holds (unsaved changes, a running operation).

`CommonActions`, `StackActions`, and `TabActions` are also re-exported for dispatching raw actions through `navigation.dispatch` or a container ref.

## Preventing removal

`usePreventRemove(true, onAttempt)` does two things on a stack screen. It sets the page's `canPop` to `false`, so the back button disappears and the pop gesture and shortcuts are disabled up front. If the page is popped anyway, because something called `pop()` on the widget directly, the navigator's dispatched pop is prevented. The `onAttempt` callback fires with the blocked action. The navigator then pushes the page straight back, so navigation state wins.

What it cannot do is Adwaita's "ask first, then maybe close" flow, because `Adw.NavigationView` has no vetoable pop: the widget notifies *after* a page is popped, so prevention for widget-initiated pops is block-up-front, not intercept-in-flight. For a genuine confirmation flow, reach for the surface Adwaita makes vetoable: present the question in a [`Dialog`](/guide/modals-and-portals), whose close attempt genuinely waits for an answer.

## What belongs in navigation state

Navigation state (which page is open, which pane is focused) belongs to the navigators. App data referenced by routes travels in **params**: a task editor screen receives `{ id }` and looks the task up, rather than the shell hoisting a `selectedTask` into its own state. The [tutorial's application shell](/tutorial/app-shell) builds a complete adaptive app this way: a split-view navigator for the sidebar and content, a stack navigator inside the content pane, and a container ref for window-level actions.

## Next

[CSS and Animations](/guide/css-and-animations) covers styling these surfaces and animating the state changes the navigators do not animate for you.
