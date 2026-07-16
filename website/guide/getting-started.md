---
description: "Scaffold a GTKX app with npm create gtkx, meet the CLI and the dev loop, and watch a real GTK4 window hot-reload as you edit TypeScript."
---

# Getting Started

Scaffold a project, meet the `gtkx` CLI, and watch a real GTK4 window hot-reload as you edit a `.tsx` file. GTKX apps are ordinary Node.js projects: no webview, no Electron main/renderer split, no bundler config to hand-write. The `gtkx` CLI wraps Vite, reads GObject-Introspection for GTK4 and Adwaita, and hands you typed React bindings for the entire native widget set.

## What you need

GTKX is Linux-only, because it renders through the system's real GTK4 and Adwaita. You need:

- Linux with the GTK4, Adwaita, and GLib development libraries installed
- Node.js 24 or later

The native addon (`@gtkx/native`) ships prebuilt binaries for x64 and arm64 glibc Linux. On other platforms the install has no usable binary; you can build the addon from the GTKX repository yourself, which needs a Rust toolchain.

## Scaffolding a new app

Start any new project with the official initializer:

::: code-group

```bash [npm]
npm create gtkx@latest
```

```bash [pnpm]
pnpm create gtkx
```

```bash [yarn]
yarn create gtkx
```

:::

It prompts for a few things:

- **Project directory** (for example `my-app`)
- **Application ID** in reverse-domain notation (for example `com.example.myapp`). This is the D-Bus name GNOME uses to identify your app, so it must look like `com.gtkx.tutorial`, not `tutorial`.
- **Package manager**
- **Use TypeScript?** and **Include testing setup (Vitest)?**

Then:

```bash
cd my-app
npm run dev
```

A window opens. The generated starter is a tiny counter: its `src/app.tsx` renders a `GtkApplicationWindow` with a `GtkLabel` and a `GtkButton` whose `onClicked` bumps `useState`. That is the whole "hello world": React state driving a real GTK4 button. The [Tutorial](/tutorial/) builds the Tasks app on top of that same skeleton, so the structure below is what you'll be working in.

::: tip
The finished Tasks app lives at `examples/tutorial` in the GTKX repository. Every snippet in the [Tutorial](/tutorial/) is copied from that source, sometimes trimmed to the parts each chapter needs. You can run it, read ahead, or diff your work against it at any point.
:::

## Project structure

Here is what the scaffolder writes for the counter starter:

```
my-app/
├─ gtkx.config.ts        # application ID + which native libraries to bind
├─ package.json          # scripts, deps, the #data/* import
├─ tsconfig.json
├─ vitest.config.ts
├─ src/
│  ├─ index.tsx          # entry point: createRoot().render(<App/>)
│  ├─ app.tsx            # GtkApplication window with a GtkLabel + GtkButton counter
│  └─ gtkx-env.d.ts      # ambient type references
└─ tests/
   └─ app.test.tsx
```

This tree assumes the default prompts (TypeScript and Vitest testing, both default to yes). A JavaScript project drops `tsconfig.json` and `src/gtkx-env.d.ts`; declining the testing setup drops `vitest.config.ts` and `tests/app.test.tsx`.

You will not find a `@gtkx/gi` or `@gtkx/jsx` folder checked in anywhere. Those are the typed native bindings, and they are **generated** into `node_modules/.gtkx` (more on that below), which is git-ignored along with `node_modules` and `dist`. That directory is why importing from `@gtkx/jsx/gtk` resolves even though you never installed it as a dependency.

## Configuration

`gtkx.config.ts` names your application ID and the native libraries to bind (`Gtk-4.0` and `Adw-1`), and `tsconfig.json` is a standard `NodeNext` setup with `react-jsx` so you never import React by hand. See [Configuration and Codegen](/guide/configuration-and-codegen) for every option and how the CLI turns them into typed bindings.

GTKX's bindings exist for what only the GNOME platform provides: widgets, actions, GSettings, notifications, dialogs. For everything Node.js already covers, a GTKX app uses the Node standard library, as [Why GTKX](/guide/why-gtkx) explains.

## The entry point: `src/index.tsx`

Mounting a GTKX tree looks exactly like React DOM, minus the DOM node:

```tsx
import { createRoot } from "@gtkx/react";
import { App } from "./app.js";

createRoot().render(<App />);
```

`createRoot()` from `@gtkx/react` returns a root with the familiar `render(element)` / `unmount()` pair. There's no container argument to pass because the "container" is the native application itself, not an element in a page. `<App />` is your top-level component. The counter starter wraps its window in `<GtkApplication>`; the Tasks app swaps that for `<AdwApplication>` (imported from `@gtkx/jsx/adw`) to pull in Adwaita, which initializes when its bindings load (see [The Application Shell](/tutorial/app-shell)). Either way, the application element picks up the `applicationId` from your config automatically.

::: info
Note the `./app.js` import specifier even though the file is `app.tsx`. The project uses `"module": "NodeNext"`, which follows Node.js ESM resolution: you write the `.js` extension the compiler emits, and it resolves the `.tsx` source.
:::

## Ambient types: `src/gtkx-env.d.ts`

This file wires up the types for things that aren't plain modules: asset imports and your generated GSettings schemas.

```ts
/// <reference types="@gtkx/cli/env" />
/// <reference path="../node_modules/.gtkx/env.d.ts" />
```

The first reference pulls in `vite/client` plus type declarations for every asset kind you can import (`*.png`, `*.svg`, `*.css?url`, and so on), each typed as a resource module. The second points at a **generated** file: codegen writes `node_modules/.gtkx/env.d.ts` with a typed module declaration for each `#data/*.gschema.xml` schema, so `import schema from "#data/com.gtkx.tutorial.gschema.xml"` is fully typed. The scaffolder seeds an empty version of that file so the reference always resolves, and `gtkx dev`, `gtkx build`, and `gtkx codegen` rewrite it with a declaration per schema.

## The dependencies

The counter starter installs four runtime dependencies:

- **`@gtkx/react`** ships the reconciler plus hooks and helpers (`createRoot`, `useApplication`, `useSetting`, `useSignal`, `createPortal`, `quit`, ...).
- **`@gtkx/css`** is CSS-in-JS for GTK4's CSS (a `css` tagged template that feeds a widget's `cssClasses`).
- **`@gtkx/runtime`** is the hand-written FFI runtime the generated bindings call into; it depends on and re-exports parts of `@gtkx/native`, the prebuilt addon.
- **`react`** is plain React 19. GTKX is a custom reconciler, not a fork.

The completed Tasks app adds three more runtime dependencies in the chapters that first need them:

- **`@gtkx/components`** provides high-level React components over the harder GTK4 APIs, notably the model-backed collection components `ListView`, `ColumnView`, `GridView`, and `DropDown`, plus a declarative `Menu` builder over `Gio.Menu`.
- **`@gtkx/navigation`** provides React Navigation-powered navigators (stack and split view) backed by Adwaita widgets. See [Navigation](/guide/navigation).
- **`@gtkx/animated`** brings framer-motion to native widgets: declarative enter/exit animations, gestures, drag, and layout animations. See [CSS and Animations](/guide/css-and-animations).

`@gtkx/cli` and `@gtkx/config` are dev-only: the CLI is the `gtkx` binary, and `@gtkx/config` provides `defineConfig`.

The `"imports": { "#data/*": "./data/*" }` map resolves `#data/...` specifiers to your `data/` directory, which is also how the CLI discovers your GSettings schemas.

## The dev loop: the `gtkx` CLI

Three commands cover the day-to-day loop:

```bash
gtkx dev        # dev server with Fast Refresh
gtkx build      # production bundle in dist/
gtkx codegen    # (re)generate the native bindings
```

A fourth subcommand, `gtkx docs`, generates markdown reference pages for the JSX elements of the libraries declared in `gtkx.config.ts`; you'll rarely need it.

**`gtkx dev`** is what you'll run while building the app. It starts a Vite dev server wired to a supervisor that launches your GTK4 app and hot-reloads it. Edit a component, save, and the running window updates in place with React Fast Refresh: your `useState` survives the reload, so you don't lose the task you were mid-edit on. It also watches `gtkx.config.ts` and your schemas.

**`gtkx build`** produces a self-contained `dist/bundle.js`, alongside the native addon (`dist/gtkx.node`) and, when you have GSettings schemas, a compiled `dist/gschemas.compiled`. `npm start` (`node dist/bundle.js`) runs that bundle directly.

**`gtkx codegen`** is the piece that makes GTKX feel native-typed. It reads the GObject-Introspection data for every library in `gtkx.config.ts` and generates the raw `@gtkx/gi/<lib>` classes and the `@gtkx/jsx/<lib>` React components into `node_modules/.gtkx`. The same generator emits the types and the FFI calls, so they stay in sync; see [Configuration and Codegen](/guide/configuration-and-codegen) for how staleness is detected.

You rarely run `codegen` by hand: `gtkx dev` and `gtkx build` regenerate the bindings automatically when they're stale (a fingerprint check skips it when nothing changed). The one place it's explicit is typechecking, where the bindings must exist before `tsc` runs:

```json
"typecheck": "gtkx codegen && tsc --noEmit"
```

::: tip
If your editor can't resolve `@gtkx/jsx/gtk` or `#data/...` right after cloning, run `npm run codegen` (or `npm run dev` once) to populate `node_modules/.gtkx`, then restart the TypeScript server.
:::

## Next

With the project scaffolded and the dev loop running, continue to [Configuration and Codegen](/guide/configuration-and-codegen) for the full option and codegen reference. To build the Tasks app end to end, start the [Tutorial](/tutorial/).
