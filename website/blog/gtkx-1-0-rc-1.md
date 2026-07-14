---
title: "GTKX 1.0 RC1: a flexible React platform for the GNOME stack"
description: "GTKX 1.0.0-rc.1 reworks the framework from the ground up: bindings generated on your machine from GObject-Introspection, a DOM-like React lifecycle, a single-threaded native core, and new component, animation, and OpenGL packages."
head:
  - - meta
    - property: og:type
      content: article
---

# GTKX 1.0 RC1: a flexible React platform for the GNOME stack

<p style="opacity: 0.7; margin-top: -0.5rem;">July 14, 2026</p>

GTKX 1.0.0-rc.1 is here, and it is the largest release in the project's history. Since v0.21.0, GTKX has been reworked from the ground up. What started as a React renderer for a curated set of GTK widgets is now a general platform for driving GLib and GObject from TypeScript: real GObject instances, the entire introspected API surface of the libraries installed on your machine, and the React programming model on top.

This is a release candidate. The API described here is what we intend to ship as 1.0, and we are looking for feedback before the final release.

## Bindings are generated on your machine, for any GObject-Introspection library

The central change in 1.0 is where bindings come from. Previous versions shipped pregenerated bindings for a fixed set of libraries (GTK, libadwaita, WebKit, GtkSourceView, VTE, GES) baked into `@gtkx/ffi`. That set was whatever we chose to build, and it could drift from the GTK actually installed on your system.

Now the GTKX CLI runs code generation on your machine, reading the GObject-Introspection (`.gir`) data already installed with your development libraries. You declare which libraries you want in `gtkx.config.ts`:

```ts
import { defineConfig } from "@gtkx/config";

export default defineConfig({
  libraries: ["Gtk-4.0", "Adw-1"],
  applicationId: "com.example.myapp",
});
```

Code generation emits two packages into `node_modules` and links them as `@gtkx/gi` and `@gtkx/jsx`, so you never install them from npm:

- `@gtkx/gi/<namespace>` gives you real, fully typed TypeScript classes: `@gtkx/gi/gtk`, `@gtkx/gi/adw`, `@gtkx/gi/gio`, `@gtkx/gi/cairo`, and so on, with typed per-class signal maps, constructor-property interfaces, and interface mixins.
- `@gtkx/jsx/<namespace>` gives you one React component per widget, with typed props.

Set `libraries: "*"` and GTKX binds every introspection library it can find on the system, resolving transitive dependencies automatically. Want WebKit, VTE, or GStreamer? Install the development package and add it to the list. The bindings always match your installed GTK, and a content fingerprint of the `.gir` files triggers regeneration when the system updates underneath you.

## A React model that looks like React

Applications now boot the way a React DOM app does. `createRoot().render()` mounts a tree, and the GTK application itself is a component:

```tsx
import { GtkApplication, GtkApplicationWindow, GtkButton } from "@gtkx/jsx/gtk";
import { createRoot, quit } from "@gtkx/react";

createRoot().render(
  <GtkApplication>
    <GtkApplicationWindow title="Hello GTKX" onCloseRequest={quit}>
      <GtkButton label="Click me" onClicked={() => console.log("clicked")} />
    </GtkApplicationWindow>
  </GtkApplication>,
);
```

The reconciler was rewritten from roughly sixty hand-written per-widget node classes into a single generic reconciler that instantiates real GObject classes by type and drives child attachment from generated metadata. Because every element is a real GObject, JSX composes in ways it could not before: any element passed as a prop value is mounted and assigned to that property, so a text view can take `buffer={<GtkTextBuffer>...</GtkTextBuffer>}`, a scale can take `adjustment={<GtkAdjustment .../>}`, and controllers, layout managers, and menu models are all declarative children. Signals are typed end to end, including `notify::<property>` details, and there are new hooks (`useSignal`, `useTickCallback`, `useProperty`, and typed `useSetting` backed by imported GSettings schemas).

## Higher-level building blocks

Hand-written high-level widgets moved out of the renderer into focused packages. `@gtkx/components` ships declarative collection views (`ListView`, `GridView`, `ColumnView`, `DropDown`) with controlled selection, tree expansion, and sections, a `Menu` builder over `Gio.Menu`, layout helpers (`Grid`, `Fixed`, `Overlay`, `SizeGroup`, `ConstraintLayout`), and, under `@gtkx/components/adw`, `Dialog` and `ComboRow`. `@gtkx/animate` replaces the old animation elements with a motion-style API: an `animated` factory, `AnimatePresence` for exit animations, springs and named easings, all still driven through libadwaita's animation primitives. `@gtkx/css` was rebuilt on the stylis compiler for correct nested selectors and at-rule handling.

## A native core rebuilt for one thread

The native module was rewritten from a two-thread Neon addon into a single-threaded napi-rs design. The default GLib main context is now acquired on the Node thread and driven directly from libuv, so GTK and JavaScript share one thread with no cross-thread marshalling. The crate no longer links GTK at all: it links only GLib and loads every other library on demand, which is what makes GTKX a general GObject bridge rather than a GTK-specific one.

Error handling improved across the boundary. GLib criticals, native failures, and Rust panics now surface as Node fatal exceptions instead of being swallowed or reduced to a message string, and exceptions thrown in your signal handlers propagate with their original stack. On top of the FFI runtime in `@gtkx/ffi` you can now subclass any GObject from TypeScript with `registerClass`, including virtual-function overrides, and bind arbitrary native functions with the typed `t` descriptor DSL. OpenGL moved into its own `@gtkx/gl` package, generated from the Khronos registry to cover the full OpenGL 4.6 core profile.

## Tooling

The CLI is now driven by `gtkx.config.ts` and adds `gtkx codegen` and `gtkx docs` commands, a supervised dev server that does real process restarts when a change is not Fast Refresh safe, a GResource-based asset pipeline (`import icon from "#data/icon.png"`), typed GSettings schema imports, and React Compiler on by default. Scaffolding moved to a standalone `create-gtkx` initializer. `@gtkx/testing` grew into a near-complete Testing Library port for GTK, with the full `getBy`/`queryBy`/`findBy` matrix, widget matchers, automatic cleanup, Playwright-style actionability checks on every interaction, and a `userEvent` API that roughly doubled to cover clipboard, drag and drop, gestures, and scrolling. `@gtkx/vitest` swapped Xvfb for a per-worker headless Wayland compositor. The `@gtkx/mcp` server gained tools and resources that let an AI assistant browse your project's generated API reference. And this site was rebuilt around a new [guide](/guide/why-gtkx), a hands-on [tutorial](/tutorial/) that takes a complete GNOME "Tasks" app all the way to a Flathub submission, and an [API reference](/reference/) covering the core packages.

## Breaking changes

This is a ground-up rework, so almost every import path changed. Widgets now come from `@gtkx/jsx/<namespace>` instead of `@gtkx/react`, typed classes and enums from `@gtkx/gi/<namespace>` instead of `@gtkx/ffi/<namespace>`, and apps boot with `createRoot()` and an explicit `<GtkApplication>` instead of `render(element, appId)`. Project configuration moved from a `package.json` field to `gtkx.config.ts`, high-level components moved to `@gtkx/components` and `@gtkx/animate`, and the minimum supported Node.js is now 24. The [GitHub release notes](https://github.com/gtkx-org/gtkx/releases/tag/v1.0.0-rc.1) carry the complete migration reference, item by item, with before-and-after code for each change.

## Try the release candidate

```bash
npm create gtkx@latest
```

The initializer scaffolds a project pinned to the RC. You will need Linux with the GTK4, libadwaita, and GLib development libraries, and Node.js 24 or later. Existing projects should follow the migration reference in the release notes; the import-path and lifecycle changes are mechanical, and the CLI reports actionable errors when a system introspection package is missing.

## The road to 1.0

This candidate is the shape of 1.0. Before the final release we want to hear where the migration is rough, where the generated bindings surprise you, and what is missing from the new component and testing APIs. Open a thread in [GitHub Discussions](https://github.com/gtkx-org/gtkx/discussions) or file an issue on the [tracker](https://github.com/gtkx-org/gtkx/issues). Thank you to everyone who tested the pivots along the way.
