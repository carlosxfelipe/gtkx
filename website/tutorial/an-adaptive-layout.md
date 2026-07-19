---
description: "Collapse the split view to a single pane on a narrow window, with a back button that works."
---

# A Layout That Collapses

Your app now shows a sidebar of lists beside the tasks belonging to the selected one, built in [Lists and a Sidebar](/tutorial/lists-and-the-sidebar).

Drag the window edge inward and you can see the problem. Back in [Your First Window](/tutorial/your-first-window) you gave the window `widthRequest={360}`, a promise that the app works at a phone-sized width. At 360 points there is no room for a 220 point sidebar and a task list side by side: the sidebar eats most of the window and the tasks get a column too narrow to read.

Adwaita's answer is to stop showing both panes at once. Below a width you choose, the split view becomes a single pane that shows either the sidebar or the content, with a back button in the header to get from one to the other. The widget already knows how to do this. What it needs from you is when to collapse and which pane is showing.

## Two more fields

Both of those are things the interface is currently doing, so by the rule from the last chapter they belong in the UI slice, which `partialize` excludes and which therefore starts fresh at every launch. A window that opened narrow last time should not force a narrow layout onto a wide window today.

In `src/store/ui.ts`, add the two fields and their setters:

```ts
export type UiSlice = {
    selection: Selection;
    collapsed: boolean; // [!code ++]
    showContent: boolean; // [!code ++]
    select: (selection: Selection) => void;
    setCollapsed: (collapsed: boolean) => void; // [!code ++]
    setShowContent: (showContent: boolean) => void; // [!code ++]
};

export const createUiSlice: StateCreator<Store, Mutators, [], UiSlice> = (set) => ({
    selection: { kind: "list", listId: "personal" },
    collapsed: false, // [!code ++]
    showContent: false, // [!code ++]
    select: (selection) => set({ selection }), // [!code --]
    select: (selection) => set((state) => ({ selection, showContent: state.collapsed })), // [!code ++]
    setCollapsed: (collapsed) => set({ collapsed }), // [!code ++]
    setShowContent: (showContent) => set({ showContent }), // [!code ++]
});
```

`collapsed` is whether the layout is currently in one-pane mode. `showContent` is which pane that one pane is showing: `false` for the sidebar, `true` for the tasks.

The change to `select` is the part worth slowing down on. When both panes are visible, clicking a list should leave you looking at both panes, so `showContent` stays as it is. When the layout is collapsed, clicking a list is a navigation: you are asking to see that list's tasks, which live in the pane you cannot currently see. Setting `showContent` to the current value of `collapsed` says exactly that, in one expression, without the component having to know which mode it is in.

::: warning Clicking a list on a narrow window appears to do nothing
That is this line. Without `showContent: state.collapsed`, `select` updates a pane that is offscreen and the sidebar stays put, so the app looks frozen even though the store changed.
:::

Reading `state` inside `set` is how a zustand action derives its next state from the current one. The updater form of `set` receives the whole store, which is why a UI slice action can read `collapsed` and a tasks action can read `tasks`.

## The breakpoint

Now decide when to collapse. Adwaita expresses that as an `AdwBreakpoint`: a condition on the window's size, plus what to do when the condition starts and stops holding. The window takes them through its `breakpoints` slot, one of the container slots introduced in chapter two, so the breakpoint attaches to the window itself rather than joining its children.

In `src/components/window.tsx`, read the two new fields and their setters, and add the slot:

```tsx
import * as Adw from "@gtkx/gi/adw";
import { AdwApplicationWindow, AdwBreakpoint, AdwNavigationSplitView } from "@gtkx/jsx/adw";
// ...

export const Window = () => {
    const collapsed = useStore((state) => state.collapsed);
    const showContent = useStore((state) => state.showContent);
    const setCollapsed = useStore((state) => state.setCollapsed);
    const setShowContent = useStore((state) => state.setShowContent);
    // ...

    return (
        <AdwApplicationWindow
            title="Tasks"
            widthRequest={360}
            heightRequest={294}
            onCloseRequest={() => quit()}
            breakpoints={
                <AdwBreakpoint
                    condition={Adw.BreakpointCondition.parse("max-width: 500sp")}
                    onApply={() => setCollapsed(true)}
                    onUnapply={() => setCollapsed(false)}
                />
            }
        >
            {/* ... */}
        </AdwApplicationWindow>
    );
};
```

`Adw.BreakpointCondition.parse` turns the string into the condition object the property wants. Adwaita parses these at runtime, so a typo in the string is an error you see in the terminal rather than one TypeScript catches.

The unit is worth a sentence of its own. `sp` is scale-independent pixels: it tracks the text scale factor, so when someone turns on Large Text the whole 500sp threshold grows with their text. A layout measured in `px` would keep collapsing at the same physical width while the text inside it got bigger, which is precisely backwards. Measure adaptive thresholds in `sp`.

`onApply` fires when the window becomes narrow enough for the condition to hold, `onUnapply` when it stops holding. Each one writes into the store, and every component that reads `collapsed` follows.

::: details Why not just resize the widgets in the breakpoint?
`AdwBreakpoint` can also set properties on widgets directly, which is what you would do in a Blueprint or `.ui` file where there is no other place to put the logic. Routing the breakpoint through the store instead gives you one source of truth: the split view is not the only thing that will want to know whether the layout is narrow, and a value in the store can be read by any component without threading a prop through the tree.
:::

## Wiring the split view

The split view has both properties too. Pass them down, still in `src/components/window.tsx`:

```tsx
<AdwNavigationSplitView
    collapsed={collapsed}
    showContent={showContent}
    onNotifyShowContent={(value) => setShowContent(value ?? false)}
    sidebarWidthFraction={0.25}
    minSidebarWidth={220}
    maxSidebarWidth={300}
    sidebar={/* ... */}
    content={/* ... */}
/>
```

`collapsed` flows one way: the breakpoint decides, the store records, the widget obeys. `showContent` does not, and that is why the handler is there. Once collapsed, the split view shows a back button in the content header and responds to the system back gesture, and both of those change `show-content` inside GTK4 without asking you. If that change never reaches the store, the next render passes the old `showContent` straight back down and the pane you just navigated away from snaps back into view.

This is the same controlled-widget pairing you used for the completion checkbox in [Completing, Starring, and Deleting](/tutorial/completing-and-deleting): a value prop is only half of it, and the matching notify signal is the other half. Here it happens to be a layout property rather than a piece of task data, but the rule does not change. Any GTK4 property you drive from the store needs its change reported back.

`onNotify*` handlers receive the new value first, and it is typed as nullable because a GObject property read can come back unset, hence the `?? false`.

## Run it

Start the app:

```sh
npm run dev
```

Drag the window's right edge inward. Somewhere below 500 points wide, the two panes become one: the sidebar fills the window and the task list is gone.

Click a list. The window navigates to that list's tasks, and the content header now has a back arrow on the left. Click the back arrow and you are returned to the sidebar with the list still selected. Press <kbd>Alt</kbd> + <kbd>Left</kbd>, or swipe back on a touchpad, and the same thing happens: those go through GTK4 rather than through your handler, which is exactly the case `onNotifyShowContent` exists to catch.

Now drag the window wide again. Both panes reappear side by side, and clicking a list changes the right pane while the sidebar stays visible.

## Summary

- **The window's minimum width is a promise**, and a breakpoint is how you keep it.
- **`AdwBreakpoint` mounts in the window's `breakpoints` slot** and reports a size condition starting and stopping through `onApply` and `onUnapply`.
- **Adaptive thresholds are measured in `sp`**, so they grow with the user's text scale.
- **`collapsed` and `showContent` are view state**, so they live in the UI slice and start fresh every launch.
- **Selecting a list navigates only when the layout is collapsed**, which one read of `state.collapsed` inside `select` expresses.
- **A layout property driven from the store still needs its notify signal**, or the widget's own back button loses the argument with the next render.

## Next

[Smart Views, Filters, and Search](/tutorial/smart-views-and-search) puts All Tasks, Today, Important, and Trash in the sidebar with live counts, and adds a filter and a search bar, all derived from the tasks you already have.
