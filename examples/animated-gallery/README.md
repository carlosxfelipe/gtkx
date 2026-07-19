# animated-gallery

A gallery of [`@gtkx/animated`](https://gtkx.dev/guide/css-and-animations), the motion layer for GTKX. A sidebar lists the scenes in curriculum order, from a single fade through springs, gestures, presence, orchestration, layout projection, and drag. Each scene shows a live stage with its own controls, the API surface it exercises, and notes on how the feature behaves on GTK. The header bar switches between the running scene and its source, and replays the scene so mount animations play again.

## What it demonstrates

The scenes live under `src/scenes`, grouped by section:

- **Basics**: `initial`, `animate`, `transition`, lifecycle callbacks, easing and repetition, spring physics, and keyframe arrays.
- **Values**: every animatable transform, colors and box properties, filters and text, and CSS custom properties.
- **Gestures**: `whileHover`, `whileTap`, `whileFocus`, `whileInView` with its viewport options, and the pan handlers.
- **Presence**: `AnimatePresence`, `exit`, the `sync` and `wait` modes, and `custom` presence data.
- **Orchestration**: variants, the stagger family, motion values with `useTransform` and `useSpring`, and the imperative `animate()`.
- **Layout**: layout projection, shared elements via `layoutId` and `LayoutGroup`, and an animated reordering list.
- **Drag**: constraints, elasticity, momentum, direction locking, and drag handles driven by `useDragControls` with `pointerEventFromController`.
- **System**: `MotionConfig` and how GTK's own animation settings feed motion's reduced-motion handling.

Animated values reach widgets as GTK4 CSS, so the gallery sticks to what that pipeline supports: transforms, `opacity`, colors, radii, borders, shadows, filters, spacing, font properties, and CSS variables. Scenes name the web-only APIs that do not carry over rather than omitting them silently.

The shell uses `ListView` from `@gtkx/components` for the sectioned sidebar, `@gtkx/css` for the shared scene styling, and Adwaita's navigation split view, toolbar view, and toggle group. `tests/` exercises the shell with `@gtkx/testing`.

`gtkx.config.ts` declares `Gtk-4.0`, `Adw-1`, and `GtkSource-5`, with the application ID `org.gtkx.animated-gallery`. The GtkSourceView 5 development package must be installed; see [CONTRIBUTING.md](../../CONTRIBUTING.md#system-dependencies).

## Run it

Install and build the workspace once from the repository root, then:

```sh
pnpm --filter animated-gallery dev
```

Its tests are part of the workspace suite and run from the repository root with `pnpm vitest run --project animated-gallery`. For coverage, use `pnpm --filter animated-gallery coverage`.

## Learn more

- [CSS and Animations](https://gtkx.dev/guide/css-and-animations)
- [Components and Hooks](https://gtkx.dev/guide/components-and-hooks)
- [Testing](https://gtkx.dev/guide/testing)
