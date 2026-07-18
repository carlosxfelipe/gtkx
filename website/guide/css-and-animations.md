---
description: "Style native widgets with the @gtkx/css tagged template and GTK4's own CSS engine, and animate them declaratively with @gtkx/animated, which runs framer-motion against GTK4 widgets."
---

# CSS and Animations

GTK4 styles widgets with a CSS engine of its own, and every widget carries a list of CSS classes through its `css-classes` property, which GTKX exposes as the `cssClasses` prop on every JSX element.

These packages build on that foundation. `@gtkx/css` is Emotion-style CSS-in-JS: you write styles next to your components, and it hands back class names that GTK4 resolves. `@gtkx/animated` is framer-motion for GTK4: you declare `initial`, `animate`, and `exit` targets on a widget (plus gestures, drag, and layout animations), and framer-motion's engine drives the frames, rendered as GTK4 CSS.

## The `css` tagged template

`css` from `@gtkx/css` accepts a tagged template (or Emotion object styles, or arrays of either), serializes it, registers the resulting rules with GTK4, and returns a generated class name of the form `gtkx-<hash>`. The hash comes from the serialized style content, so identical styles produce the same class and are only inserted once. That string goes straight into `cssClasses`:

```ts
import { css } from "@gtkx/css";

export const listDot = (color: string): string => css`
    min-width: 12px;
    min-height: 12px;
    border-radius: 9999px;
    background: ${color};
`;

export const addRow = css`
    background: alpha(var(--accent-bg-color), 0.08);
`;
```

```tsx
<GtkBox cssClasses={[listDot(list.color)]} />;
<GtkListBoxRow cssClasses={[addRow]} />;
```

Interpolation is ordinary JavaScript: `listDot` produces one class per distinct color and reuses the class when called with the same color again. You can also interpolate a previously generated class name into another `css` call, and its styles are inlined rather than referenced, exactly as Emotion composition works.

A single shared `Gtk.CssProvider` is attached to the default display at `STYLE_PROVIDER_PRIORITY_APPLICATION`. Every `css` call appends its rules to one stylesheet string, and updates are batched per microtask into a single `loadFromString` reload, so a render pass that creates a dozen styles costs one provider update. In development, the provider's `parsing-error` signal is logged as a warning, so a property GTK4 does not understand tells you immediately instead of failing silently.

## GTK4 CSS is its own dialect

The syntax is CSS, but the vocabulary is GTK4's. Selectors match widget node names: `window`, `button`, `entry`. The set of supported properties is GTK4's own: there is no `display: flex`, because layout belongs to containers and layout managers. The theme exports its palette as CSS variables you reference with `var()`, as `alpha(var(--accent-bg-color), 0.08)` does above.

Treat the [GTK4 CSS overview](https://docs.gtk.org/gtk4/css-overview.html) and [property reference](https://docs.gtk.org/gtk4/css-properties.html) as the source of truth for what you can write, and the Adwaita [CSS variables](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/css-variables.html) as your palette. `@gtkx/css` also protects GTK4's older `@named-color` syntax from its own compiler: any `@identifier` that is not `define-color`, `import`, `keyframes`, or `media` is treated as a named color rather than an at-rule.

Nesting works like Emotion, with `&` referring to the generated class:

```tsx
import { css } from "@gtkx/css";
import { GtkProgressBar } from "@gtkx/jsx/gtk";

const progressStyle = css`
    &.hidden {
        opacity: 0;
    }
`;

<GtkProgressBar fraction={progress} cssClasses={[progressStyle, "hidden"]} />;
```

Toggle the `hidden` class on the widget to hide the progress bar and drop it again to reveal it.

`@keyframes` blocks are written inline inside the template and emitted as top-level rules, so a class can carry its own animation:

```ts
const rainbow = css`
    animation: rainbow 1s infinite linear;

    @keyframes rainbow {
        0% { background: linear-gradient(0deg, red, orange, yellow, green, blue, purple); }
        50% { background: linear-gradient(180deg, red, orange, yellow, green, blue, purple); }
        100% { background: linear-gradient(360deg, red, orange, yellow, green, blue, purple); }
    }
`;
```

## Combining classes with `cx`

GTK4's `css-classes` property is a string array, so `cx` returns a `string[]` rather than a space-joined string. It filters out falsy tokens, which makes conditional classes read naturally, and it mixes generated classes freely with the style classes Adwaita ships (`flat`, `pill`, `suggested-action`, `dimmed`, among others):

```tsx
import { css, cx } from "@gtkx/css";
import { GtkButton } from "@gtkx/jsx/gtk";

const swatch = css`
    min-width: 48px;
    min-height: 32px;
    border-radius: 4px;
`;

<GtkButton cssClasses={cx(swatch, isSelected && "suggested-action")} />;
```

When two or more GTKX-generated classes appear in one `cx` call, their styles are concatenated in argument order and re-emitted as a single merged class, so the last argument wins on conflicting properties. This exists because the order of classes on a GTK4 widget does not encode precedence, so merging is the only way to make `cx(base, override)` mean what it says. Raw class names pass through untouched.

## Global styles

`injectGlobal` inserts rules without scoping them to a generated class, which is how you target widget node names or define theme-wide rules:

```ts
import { injectGlobal } from "@gtkx/css";

injectGlobal`
    window {
        background: var(--window-bg-color);
    }
`;
```

Importing a plain `.css` file works too: the GTKX CLI compiles the import into an `injectGlobal` call with the file's content, so a hand-written stylesheet and template-literal styles end up in the same provider.

`registerProviderForDefaultDisplay(priority?)`, exported from `@gtkx/css/internal`, is the primitive both packages use internally: it creates a `Gtk.CssProvider`, attaches it to the default display (or to the first display that opens), and returns it. Reach for it only when you need your own provider at a custom priority.

## Animating widgets with `animated`

`@gtkx/animated` wraps any widget so that it accepts framer-motion's animation props. Access an intrinsic element through the `animated` proxy (`animated.GtkLabel`, `animated.GtkButton`, any element whose instance is a `Gtk.Widget`), or wrap a custom component with `animated(MyComponent)`. The wrapped component takes everything the original takes, plus:

- `initial`: the state the widget starts from before its enter animation, or `false` to skip the enter animation and apply `animate` directly.
- `animate`: the state the widget animates to while present. Changing it starts a new animation, but only when the new target is not shallow-equal to the previous one.
- `exit`: the state the widget animates to while leaving, inside an `AnimatePresence`.
- `transition`: timing and physics, described below.
- `variants` with variant labels, and a `style` record whose values may be static or `MotionValue`s from hooks like `useMotionValue` and `useTransform`.
- The gesture targets (`whileHover`, `whileTap`, `whileFocus`, `whileInView`), `drag`, and the layout props, each covered in its own section below.
- `onAnimationStart` and `onAnimationComplete` callbacks.

A target may hold any value the GTK4 CSS bridge can render:

- `opacity`.
- Transforms: `x` and `y` (pixel translation), `scale`, `scaleX`, `scaleY`, `rotate` (degrees), `skew`, `skewX`, `skewY`, with `originX` and `originY` rendered as `transform-origin`.
- Colors: `color`, `backgroundColor`, `borderColor`, `caretColor`, `outlineColor`.
- Pixel values: `borderRadius` (and the per-corner radii), `borderWidth` (and the per-side widths), `minWidth`, `minHeight`, `margin` (and the per-side margins), `padding` (and the per-side paddings), `fontSize`, `letterSpacing`.
- Passthrough strings: `filter` and `boxShadow`.

A value can be a single target or a keyframe array. Anything outside that set is dropped with a one-time development warning, because GTK4 CSS cannot express it: there is no `width`, `height`, `top`, or `left`, so animate `minWidth`, `minHeight`, or a transform instead. An `animate` or `exit` target may also embed a `transition` of its own, which replaces the component's `transition` for the animation toward that target. An exit of `{ opacity: 0, transition: { duration: 0 } }` makes the leave instantaneous while the enter keeps its fade.

```tsx
import { animated } from "@gtkx/animated";

<animated.GtkButton
    label="Save"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.1 }}
/>;
```

The engine is framer-motion's own, running its frame loop in JavaScript. `@gtkx/animated` renders each frame's values as GTK4 CSS. Each animated widget gets a unique `gtkx-anim-<id>` class. Its rule lives in a shared animation provider registered one priority above the `css()` provider, so animated values always win over your static styles. The class and its rule are removed on unmount.

## Tweens and springs

`transition` takes framer-motion's options, and `transition.type` selects the generator. Without an explicit transition, each value gets motion's default. A keyframe array of more than two values runs a 0.8 second tween. A transform runs on a spring, and everything else runs on a 0.3 second tween.

- **Tween**: `duration` in seconds, `ease` as a named easing (such as `"easeOut"` or `"anticipate"`), a cubic-bezier array such as `[0.65, 0, 0.35, 1]`, or an easing function. A tween with a `duration` and no `ease` runs on `"easeOut"`.
- **Spring**: `type: "spring"` with the physics parameters `stiffness`, `damping`, and `mass` (defaults 100, 10, 1) plus a starting `velocity`, or the perceptual pair `visualDuration` and `bounce` from which the physics are derived. `restDelta` and `restSpeed` control when the spring counts as settled.

Both kinds accept `delay` in seconds, `repeat` (additional repetitions, `Infinity` repeats forever), `repeatType` (`"loop"`, `"reverse"`, or `"mirror"`, which mirrors the easing on the way back), and `repeatDelay`. Variants orchestrate children with `staggerChildren`, `delayChildren`, and `when`, exactly as framer-motion does on the web.

```tsx
<animated.GtkLabel
    initial={{ x: -100 }}
    animate={{ x: 0 }}
    transition={{ type: "spring", damping: 6, stiffness: 200, mass: 1 }}
>
    Bouncy
</animated.GtkLabel>;
```

::: tip Reduced motion is handled globally
`@gtkx/animated` watches GTK4's motion settings. When `gtk-enable-animations` is off, every animation completes instantly, package-wide. When `gtk-interface-reduced-motion` asks for reduced motion, it is exposed to the engine as `prefers-reduced-motion`, and framer-motion's reduced-motion handling applies. Override that per tree with `MotionConfig`: wrap a subtree in `<MotionConfig reducedMotion="always">` (or `"never"`) to force or opt out of reduced-motion handling where motion is essential.
:::

## Exit animations with `AnimatePresence`

React unmounts a widget the instant it leaves the tree, which leaves no time for a leave animation. `AnimatePresence` fixes that: it is framer-motion's own component, retyped to the options that work against GTK4 widgets, and it keeps removed children mounted until their exit animations complete. Give each direct child a stable, unique `key` so presence is tracked across renders.

```tsx
import { AnimatePresence, animated } from "@gtkx/animated";
import { GtkBox } from "@gtkx/jsx/gtk";

<GtkBox>
    <AnimatePresence>
        {showToast && (
            <animated.GtkLabel
                key="toast"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
            >
                Saved
            </animated.GtkLabel>
        )}
    </AnimatePresence>
</GtkBox>;
```

`AnimatePresence` takes these props besides `children`:

- `initial` (default `true`): whether children already present on the first render run their enter animations. Pass `false` to mount them directly in their `animate` state and animate only subsequent changes.
- `mode`: how entering and exiting children overlap. `"sync"` (the default) runs both at once. `"wait"` finishes every exit before the entering children mount, which is what you want when two views occupy the same slot. The web-only `"popLayout"` mode is not supported.
- `onExitComplete`: fires once after all exiting children have finished, useful for sequencing work behind a departure.
- `custom`: forwards a value to exiting children as their `custom` prop, so dynamic variants resolve against fresh data mid-exit.
- `propagate`: lets an exit cascade through nested `AnimatePresence` components.

An instantaneous exit is not held for a fade. An exit is instantaneous when the child has no `exit` values, when its exit transition has a zero duration, or when animations are disabled system-wide. `AnimatePresence` removes such a child within a frame of the update that removed it from your JSX, so it never appears on screen next to its replacement content.

::: tip
In tests, `render` from `@gtkx/testing` disables animations by default so assertions see final states immediately. Pass `render(element, { animations: true })` when the animation itself is what you are testing. See [Testing](/guide/testing) for the full model.
:::

## Gestures

The gesture targets apply while an interaction is active and reverse when it ends: `whileHover`, `whileTap`, `whileFocus`, and `whileInView`. Each has matching callbacks: `onHoverStart` and `onHoverEnd`; `onTapStart`, `onTap`, and `onTapCancel`; `onViewportEnter` and `onViewportLeave`.

```tsx
<animated.GtkButton
    label="Press"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.9 }}
    onTap={() => console.log("tapped")}
/>;
```

The input is native: hover comes from a `Gtk.EventControllerMotion`, presses from a `Gtk.GestureClick` and `Gtk.GestureDrag` pair, and focus from a `Gtk.EventControllerFocus`, all attached to the widget and feeding framer-motion's own gesture logic. `whileFocus` activates only while the toplevel shows focus visibly, so it highlights keyboard navigation rather than every click, matching `:focus-visible` semantics on the web. Keyboard activation does not trigger `whileTap`: pressing a focused button with <kbd>Enter</kbd> or <kbd>Space</kbd> fires the button's own `onClicked` but not the tap gesture.

`whileInView` activates while the widget is visible inside its scrollable viewport, which by default is the nearest ancestor `GtkScrolledWindow` (or the toplevel when there is none). Tune it with the `viewport` prop:

- `root`: points at a different scroll container through a widget ref.
- `margin`: grows or shrinks the viewport box (pixel values only).
- `amount`: `"some"` (the default), `"all"`, or a ratio between 0 and 1.
- `once`: keeps the state active after the first entry.

```tsx
<animated.GtkImage
    iconName="starred-symbolic"
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ amount: "all", once: true }}
/>;
```

## Drag

`drag` makes a widget follow the pointer: `drag` alone allows both axes, `drag="x"` or `drag="y"` locks one. The remaining props tune the motion:

- `dragConstraints`: bounds the motion, either as pixel offsets from the layout position (`{ left: 0, right: 240 }`) or as a ref to another widget whose bounds become the boundary.
- `dragElastic` (0 to 1): how far the widget can be pulled past its constraints.
- `dragMomentum` (default `true`): carries the release velocity into an inertia animation.
- `dragSnapToOrigin`: animates the widget back to where it started.
- `onDragStart`, `onDrag`, and `onDragEnd`: report progress.

```tsx
const areaRef = useRef<Gtk.Box | null>(null);

<GtkBox ref={areaRef} heightRequest={200}>
    <animated.GtkBox drag dragConstraints={areaRef} dragElastic={0.2}>
        <GtkLabel>Drag me</GtkLabel>
    </animated.GtkBox>
</GtkBox>;
```

The gesture is a `Gtk.GestureDrag` in the capture phase. It claims the GTK4 event sequence only after the pointer has moved 3 pixels, so plain clicks fall through to the children: a draggable card with a button inside stays clickable.

To start a drag from a handle rather than the widget itself, `useDragControls` returns a controls object you pass as `dragControls`, and `pointerEventFromController` converts a live GTK4 gesture into the pointer event that `start` expects:

```tsx
import { animated, pointerEventFromController, useDragControls } from "@gtkx/animated";
import { GtkBox, GtkGestureDrag, GtkImage, GtkLabel } from "@gtkx/jsx/gtk";

const Card = () => {
    const controls = useDragControls();
    return (
        <GtkBox>
            <GtkImage
                iconName="list-drag-handle-symbolic"
                controllers={
                    <GtkGestureDrag
                        onDragBegin={(_x, _y, gesture) => controls.start(pointerEventFromController(gesture))}
                    />
                }
            />
            <animated.GtkBox drag="y" dragControls={controls} dragListener={false}>
                <GtkLabel>Dragged by the handle</GtkLabel>
            </animated.GtkBox>
        </GtkBox>
    );
};
```

`dragListener={false}` keeps the widget's own pointer input from starting drags, so only the handle does.

## Layout animations

The `layout` prop animates a widget between layouts. When a re-render moves or resizes it, the widget is measured before and after (with `computeBounds` against the toplevel), and the difference plays as a CSS transform animation instead of a jump. `onLayoutAnimationStart` and `onLayoutAnimationComplete` report the lifecycle.

```tsx
<animated.GtkBox layout>
    <GtkLabel>I glide when the layout shifts</GtkLabel>
</animated.GtkBox>;
```

`layoutId` connects widgets across renders: when a widget with a `layoutId` unmounts and another with the same id mounts, the new one animates from the old one's bounds, the shared-element transition. Both widgets must carry distinct `key` props so React actually swaps them:

```tsx
{expanded ? (
    <animated.GtkBox key="hero" layoutId="cover" heightRequest={240} />
) : (
    <animated.GtkBox key="thumb" layoutId="cover" heightRequest={80} />
)}
```

`LayoutGroup` groups animated widgets so that a layout change in one remeasures the others, and its `id` prop namespaces `layoutId`s between independent instances of the same component. When animated widgets live inside a `GtkScrolledWindow` that is itself animated, set `layoutScroll` on the animated scroll container so measurements account for its scroll offsets. Shared `layoutId` transitions work within one window; a `layoutId` cannot animate across windows.

## Dark style and theming

You cannot force light or dark from CSS. Adwaita centralizes the color scheme on `Adw.StyleManager`, a process-wide singleton from `@gtkx/gi/adw` that you drive imperatively with `setColorScheme`. Every theme color you used above re-resolves automatically when the scheme flips.

To vary your own rules by scheme, wrap them in `@media (prefers-color-scheme: dark)` inside a `css` template; GTK4 evaluates the query and `@gtkx/css` scopes it around the generated class. The [Preferences and Theming](/tutorial/preferences-and-theming) tutorial chapter walks the complete pattern in the Tasks app: a GSettings-backed preference, an `applyColorScheme` helper, and a preferences dialog that switches the theme live.

## Next

Continue with [OpenGL](/guide/opengl) to draw with the GPU inside a widget, or jump to [Testing](/guide/testing) to see how the reconciler renders and asserts on widgets, including how animations behave under test.
