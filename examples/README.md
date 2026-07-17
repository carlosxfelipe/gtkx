# Examples

Four apps built with GTKX, the React framework for Linux. Each one renders GTK4 and Adwaita widgets, the same widget set GNOME ships, from React components and hooks.

| Example | What it is |
| --- | --- |
| [`hello-world`](hello-world) | A counter window: the smallest complete GTKX app. Covers intrinsic elements, state, signals as props, and style classes. |
| [`gtk-demo`](gtk-demo) | A React port of the official GTK4 widget showcase. Covers lists, dialogs, gestures, constraints, CSS, and OpenGL. |
| [`browser`](browser) | A web browser built on `WebKitWebView`. Covers a third-party GObject-Introspection library, refs, and CSS-in-JS. |
| [`tutorial`](tutorial) | Tasks, the complete GNOME app the documentation builds. Covers navigation, settings, notifications, and packaging. |

## Running them

`hello-world`, `gtk-demo`, and `browser` are members of the pnpm workspace. Install and build once from the repository root, then start any of them:

```sh
pnpm install
pnpm build
pnpm --filter gtk-demo dev
```

`tutorial` is deliberately excluded from the workspace. It installs `@gtkx/*` from the npm registry the way your own app does, so it uses npm, not pnpm. See [`tutorial/README.md`](tutorial/README.md).

## System dependencies

Codegen reads GObject-Introspection data from the development packages installed on your machine, so every library an example declares in its `gtkx.config.ts` needs its GIR files present. Beyond GTK4 and Adwaita, `gtk-demo` needs GtkSourceView 5 and `browser` needs WebKitGTK 6. [CONTRIBUTING.md](../CONTRIBUTING.md#system-dependencies) lists the packages.

## Documentation

The full documentation lives at [gtkx.dev](https://gtkx.dev). To build an app of your own, start with [Getting Started](https://gtkx.dev/guide/getting-started) or follow the [tutorial](https://gtkx.dev/tutorial/).
