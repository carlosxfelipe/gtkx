---
title: "CSS"
description: "Style native widgets with the @gtkx/css tagged template and GTK4's own CSS engine: generated class names, cx, global styles, and dark style."
---

# CSS

`@gtkx/css` is Emotion-style CSS-in-JS: you write styles next to your components, and it hands back class names that GTK4 resolves.

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

GTK4's own `@`-prefixed color references survive serialization intact, so `background: @card_bg_color;` and `box-shadow: 0 0 0 1px alpha(@accent_bg_color, 0.4);` reach GTK4 exactly as written, nested selectors included, while `@media` and `@keyframes` are still parsed as at-rules. Adwaita exposes its palette as CSS custom properties, so reach for `var(--accent-bg-color)` in new styles and keep the `@` form for stylesheets you are porting.

A single shared `Gtk.CssProvider` is attached to the default display at `STYLE_PROVIDER_PRIORITY_APPLICATION`. Every `css` call appends its rules to one stylesheet string, and updates are batched per microtask into a single `loadFromString` reload, so a render pass that creates a dozen styles costs one provider update. In development, the provider's `parsing-error` signal is logged as a warning, so a property GTK4 does not understand tells you immediately instead of failing silently.

## Transitions and keyframes

GTK4 animates from CSS, so `transition` and `animation` behave the way they do on the web, and both belong in the same `css` template as the rest of a widget's styles:

```ts
import { css } from "@gtkx/css";

export const pendingRow = css`
    background: alpha(var(--accent-bg-color), 0.08);
    transition: background 200ms ease-out;
    animation: tasks-pulse 1.2s ease-in-out infinite;

    &:hover {
        background: alpha(var(--accent-bg-color), 0.16);
    }

    @keyframes tasks-pulse {
        50% {
            background: alpha(var(--accent-bg-color), 0.24);
        }
    }
`;
```

The ordinary declarations stay scoped to the generated class, while the `@keyframes` block is hoisted out and emitted as a top-level rule. That is the mirror image of `@media`, which stylis wraps around the generated class instead (see [Dark style and theming](#dark-style-and-theming) below). The practical consequence is that keyframes names are global rather than hashed, so give them a prefix of your own to keep two components from claiming the same name.

## Combining classes with `cx`

GTK4's `cssClasses` property is a string array, so `cx` returns a `string[]` rather than a space-joined string. It filters out falsy tokens, which makes conditional classes read naturally, and it mixes generated classes freely with the style classes Adwaita ships (`flat`, `pill`, `suggested-action`, `dimmed`, among others):

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

## Dark style and theming

You cannot force light or dark from CSS. Adwaita centralizes the color scheme on `Adw.StyleManager` from `@gtkx/gi/adw`. `Adw.StyleManager.getDefault()` returns the manager covering the whole application, and `setColorScheme` on it drives light or dark imperatively. Every theme color you used above re-resolves automatically when the scheme flips.

To vary your own rules by scheme, wrap them in `@media (prefers-color-scheme: dark)` inside a `css` template; GTK4 evaluates the query and `@gtkx/css` scopes it around the generated class. The [Preferences and Theming](/tutorial/preferences-and-theming) tutorial chapter walks the complete pattern in the Tasks app: a GSettings-backed preference, an `applyColorScheme` helper, and a preferences dialog that switches the theme live.

## Next

Continue with [OpenGL](/guide/opengl) to draw with the GPU inside a widget.
