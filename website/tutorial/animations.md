---
description: "Give the empty state a subtle fade with @gtkx/animate, and learn where motion belongs in a GNOME app: communicate real state changes, honor reduce motion, and never re-animate what the toolkit already animates."
---

# Animations

This page adds one animation, a fade on the empty-state placeholder, and shows where motion does not belong in a GNOME app.

Most of the motion in Tasks is not ours. Adwaita already animates the things that should move: `AdwNavigationView` slides the task editor in over the list, `AdwToastOverlay` slides the undo toast up from the bottom, `GtkSearchBar` reveals its entry, the selection action bar slides in through `AdwToolbarView`, and every dialog animates its own present and dismiss. You get all of that by using the widgets, with no animation code at all.

Given a toolkit that already animates the important transitions, the scope is narrow: one hand-written animation, on the one screen in Tasks that would look wrong without it.

## The gap: a hard cut between the list and the empty state

Back in [The Task List](./the-task-list) the content pane showed either the boxed list or, when the filtered set was empty, an `AdwStatusPage` placeholder. In `components/task-list.tsx` those two are not stacked alternatives; they are siblings in the same vertical `GtkBox`. The `GtkListBox` is always mounted (it holds the inline add-entry row even at zero tasks), and the status page is an extra child that mounts below it only when there is nothing to show. Before this chapter's change, that child is a plain `AdwStatusPage`:

```tsx
<GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
    <GtkListBox selectionMode={Gtk.SelectionMode.NONE} cssClasses={["boxed-list"]}>
        {/* add-entry row, task rows, trailing "Add Task" row */}
    </GtkListBox>
    {tasks.length === 0 ? (
        <AdwStatusPage cssClasses={["compact"]} iconName={empty.icon} title={empty.title} description={empty.description} />
    ) : null}
</GtkBox>
```

Because nothing here is a `GtkStack`, that mount and unmount has no transition whatsoever. Delete your last task and the placeholder snaps into existence; add the first one back and it vanishes on the same frame the row appears. It reads as a glitch, and it is the textbook case the GNOME Human Interface Guidelines describe. There is no dedicated "motion" page in the current HIG; the governing rule is the [Be Considerate](https://developer.gnome.org/hig/principles.html) principle, "Respect people's time and attention. Don't interrupt or distract them unnecessarily." Motion earns its place when it makes a change legible, when it tells you that one thing gave way to another instead of hard-cutting between them. Here a real state change (populated becomes empty, and back) is presented as a jarring swap, exactly the hard cut a transition exists to soften.

::: info Why `AdwViewStack` does not fit
Adwaita's sanctioned tool for crossfading a placeholder is `AdwViewStack` with `enable-transitions`. It does not fit here, because it assumes the two states are *mutually exclusive stacked views*. In this layout the list never goes away: it keeps showing its add-entry row even at zero tasks, and the status page is an additional sibling below it. There is no second view to crossfade against, so the right tool is an enter/exit animation on the status page alone.
:::

## The fix: `AnimatePresence` and `animated.AdwStatusPage`

`@gtkx/animate` is the Framer-Motion-style layer covered in [CSS and Animations](/guide/css-and-animations). Two pieces of it solve this. `animated.<Widget>` wraps any intrinsic element whose instance is a `Gtk.Widget` so that it accepts animation props, and `AnimatePresence` keeps a removed child mounted just long enough to play its leave animation. `@gtkx/animate` is already a dependency of the tutorial, so the fade itself is two edits to one file, plus a key on the list in `app.tsx`, which a later section explains.

First the imports. The status page becomes an animated one, so `AdwStatusPage` moves out of the `@gtkx/jsx/adw` import (the file uses it nowhere else, so the name drops from the import list) and `@gtkx/animate` comes in:

```tsx
import { AnimatePresence, animated } from "@gtkx/animate";
// ...
import { AdwButtonRow, AdwClamp, AdwEntryRow } from "@gtkx/jsx/adw";
```

Then the empty-state block itself, wrapped in `AnimatePresence` and rendered through `animated.AdwStatusPage`:

```tsx
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

The animation props read like their web counterparts. `initial` is the state the widget starts from, `animate` is where it settles once present, and `exit` is where it goes on the way out. A target is opacity plus CSS transforms; here it is a plain opacity fade from `0` to `1`. A `transition` of `0.2` seconds makes it a short timed tween on the default `easeOut` curve. The `exit` target embeds a `transition` of its own that zeroes the duration on the way out; a later section explains that asymmetry.

Under the hood there is no JavaScript timer: `@gtkx/animate` builds an `Adw.TimedAnimation`, drives an `Adw.CallbackAnimationTarget`, and writes the interpolated `opacity` as scoped GTK4 CSS on the widget. It is Adwaita animating a real widget, reached declaratively.

## `AnimatePresence` is what makes `exit` possible

Without `AnimatePresence` there would be no exit animation at all. React removes a widget from the tree the instant its condition goes false, which leaves no frame in which to animate it leaving. `AnimatePresence` intercepts that: when `tasks.length === 0` flips to `false`, it holds the status page mounted, plays its `exit` target, and only then lets React drop it. Here that exit is deliberately instantaneous, as the next section explains, but the wrapper still earns its place twice over: it is what makes an `exit` target possible at all, and its `initial` prop is what keeps the enter fade off the first paint, covered right after.

The one rule it imposes is a stable `key` on the child. `AnimatePresence` tracks presence by key; a child without one is dropped from its output with a development warning, and the exit never plays. Note that the key is a constant `"empty"`, not derived from the placeholder's contents. The same status page shows several messages depending on where you are (`No Tasks Yet`, `Trash Is Empty`, `No Results` while searching), all through the `empty` prop. Keeping the key constant across all of them is deliberate: switching from one empty message to another, for example typing in the search box while the results stay at zero, is a *prop update* on the same present widget, not a remount, so it does not re-fade. Only the populated-to-empty boundary animates, which is exactly the restraint the HIG asks for. Change the key to `empty.description`, which embeds the query text, and every no-results keystroke would flash the placeholder out and back in.

## The exit is a cut, not a fade

The two directions of this boundary are not symmetric, and the `exit` target encodes that. When the last task disappears, the pane is otherwise empty; the placeholder fading in over 0.2 seconds is the only motion on screen, and it narrates exactly what happened. When the first task arrives, the situation is reversed. The rows are already visible, and the status page is an in-flow sibling below the list, not a stacked view, so a leave fade would play out underneath the freshly populated list: new content above, a slowly dissolving ghost of the empty state below, both on screen at once. The rows' appearance already communicates the change; the lingering ghost communicates nothing and reads as a glitch.

So the exit opts out of the fade. Any `animate` or `exit` target can embed a `transition` of its own, which replaces the component's `transition` for that one animation:

```tsx
exit={{ opacity: 0, transition: { duration: 0 } }}
```

With a zero duration the exit completes immediately, and `AnimatePresence` drops the status page in the same update that mounts the rows. Populated to empty fades; empty to populated cuts. Each direction gets exactly the motion that has something to say.

## First paint should not animate

`AnimatePresence initial={false}` is the small, important detail. By default `AnimatePresence` runs enter animations for children that are already present on its very first render, so launching straight into an empty view (a fresh install, or an empty Trash) would fade the placeholder in from transparent. But the user did not just empty that list; it was already empty when the window opened. Fading it in there is motion with nothing to communicate, the decorative kind the HIG rejects. `initial={false}` mounts any first-render child directly in its `animate` state, while a status page that appears later, because you actually deleted your last task, still runs its `initial` to `animate` fade. Genuine state changes animate; initial conditions do not.

## Keeping the fade inside its view

`AnimatePresence` tracks presence inside whatever subtree stays mounted around it, and that scope is wider than it first appears. `TaskList` renders at the same tree position for every sidebar view, so clicking from a populated list to an empty Today does not remount it; React hands the same component a new `tasks` array. To the wrapper, that is indistinguishable from deleting your last task: the condition flips, the status page mounts, and the enter fade plays. But nothing was just emptied; you navigated, so the fade is the same decorative motion `initial={false}` already keeps off the first paint.

The remedy is to make navigation a remount instead of a prop update. In `app.tsx`, key the list by the identity of the current view:

```tsx
const keyFor = (selection: Selection): string =>
    selection.kind === "list" ? `list-${selection.listId}` : `smart-${selection.view}`;
```

```tsx
<TaskList
    key={keyFor(selection)}
    tasks={visible}
    /* ... */
/>
```

Changing the selection now unmounts the old `TaskList`, taking its `AnimatePresence` and any in-flight animation with it, and mounts a fresh one. `initial={false}` from the earlier section does the rest: the new view's placeholder, if it has one, appears directly in its settled state. Within a view nothing changes, because there the key is stable; deleting your last task still fades the placeholder in, and adding the first one back still cuts it away.

Note what the key leaves out. The search query is not in it, or every keystroke would remount the list and destroy the focused search entry. The All/Open/Done filter is not in it either: filtering re-slices the same list you are already looking at, which is exactly the populated-to-empty boundary the fade was built to narrate. Only navigation, the switch to a different view, gets the hard remount.

## Reduce motion is handled for you

Because the fade is an `Adw.Animation`, it honors the system "enable animations" accessibility setting automatically, with no code of ours. When a user turns on Reduce Motion, Adwaita skips the animation to its final value: the status page appears and disappears instantly, and the `exit` still completes so the widget still unmounts cleanly. The swap becomes the hard cut it was before, which is the correct behavior for someone who asked for less motion.

This is free only because we left `followEnableAnimations` at its default. Building UI state changes on a raw timer would bypass the accessibility setting entirely; building them on Adwaita's animation primitives, as `@gtkx/animate` does, means Reduce Motion is respected by construction. (JavaScript timers keep their place for scheduling work; it is motion specifically that belongs on the animation primitives.) You would set `followEnableAnimations: false` on the transition only to force an animation to always run because its motion carries essential meaning, which a decorative fade never does.

## Why a tween here, and not a spring

`@gtkx/animate` offers both timed tweens and physics springs, and this fade is a tween. A spring is *physically simulated*: it has no fixed duration, it can overshoot, and it exists to model motion that tracks a gesture, the deceleration after you fling or drag something. This fade is none of that. It is a discrete, non-interactive view swap with a known start and end, so a short timed tween on an easing curve is the correct choice, and overshoot on a simple opacity fade would look wrong.

Tasks ships no spring at all, because no surface in it qualifies. The clearest example of restraint is the important-star toggle on each row: it would be easy to make the star pop with a springy bounce when you tap it, but a star toggle is a discrete tap, and the HIG has discrete taps update instantly. The icon already swaps from outline to filled, which says everything the change needs to say; a bounce would add motion the interaction did not call for. Springs belong on gestures, and Tasks has none that would benefit, so it has no springs.

## What not to animate

The guardrail is as much a part of the lesson as the animation. The reason Tasks needed exactly one hand-written animation is that the toolkit already animates everything else, and overriding those is a step backward:

- **The natively animated transitions.** `GtkSearchBar`, the selection `GtkActionBar` and `AdwToolbarView` bottom bar, `AdwNavigationView` push and pop, `AdwNavigationSplitView`'s collapse, `AdwToastOverlay` toasts, the `AdwToggleGroup` filter pill, and every Adwaita dialog animate themselves. Wrapping any of them in `animated` would fight the built-in transition for no gain, and for dialogs and navigation it would fight their lifecycle.
- **The task rows.** This is the tempting one, and it is a trap. Reaching for `AnimatePresence` over the mapped rows to fade them in and out looks like the marquee use of the feature, but the `tasks` prop is the already filtered, sorted, and searched `visible` array. Its keyed set is rewritten wholesale on every search keystroke, every All/Open/Done toggle, and every sort change, so `AnimatePresence` could not tell "the user deleted one row" from "the filter changed" and would cascade an enter or exit across the entire list on each of them. That is precisely the re-animate-everything-on-every-view-change distraction the HIG forbids. It also would not even look right: the animator tweens opacity and transforms, which do not collapse a `GtkListBox` row's allocated height, so a faded-out row would leave its gap open until it unmounted and the neighbors snapped closed. And it would collide with the per-row drag controllers from the previous chapter. When a deletion needs feedback, Tasks already gives the better, more idiomatic answer: an undo toast.

One animation, on the one boundary that had no transition and a real change to communicate. That is the entire motion budget a well-behaved GNOME app needs.

## Next

Continue to **The Task Editor**.
