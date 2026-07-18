---
description: "What GTKX is, why it exists, and how it compares to GJS, node-gtk, and portable subsets like React Native."
---

# Why GTKX

GTKX lets you build native GTK4 and Adwaita apps in TypeScript, with React components and hooks driving GObject widgets. What you ship is a GNOME app, built from GNOME's own widgets.

## A declarative layer for the GNOME stack

GTK4 is mature, and GtkBuilder XML can lay out an interface and bind properties into it. The widget tree it builds is still fixed: keeping that structure in sync with your application state is left to imperative code you write yourself, and nothing hot-reloads the interface as you work. GTKX adds that missing layer, and the tooling around it, on top of the stack you already know:

- a React reconciler that exposes every GObject as a JSX element,
- a CLI for scaffolding, development, and production builds,
- a dev server with Fast Refresh that patches your running UI in place,
- CSS-in-JS styling, spring and tween animations, React Navigation-style navigators, and high-level list, grid, and dialog components,
- a Testing Library-style API for querying and driving your widgets in tests,
- and a Model Context Protocol (MCP) server that exposes your live app to AI agents.

## The full GNOME API surface

React Native and similar frameworks hide the native toolkit so one API can run everywhere. GTKX exposes it: GTK4, Adwaita, and any other GObject-Introspection library on your system are reachable from JSX. GTKX is Linux-only by design.

Your JSX becomes live GObject instances: a `GtkButton`, an `AdwHeaderBar`. Apps built with GTKX inherit the native GNOME look and behavior because they are made of the same widgets GNOME apps are made of.

## What it looks like

```tsx
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { useState } from "react";

const Counter = () => {
    const [count, setCount] = useState(0);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20} valign={Gtk.Align.CENTER}>
            <GtkLabel cssClasses={["title-2"]}>{`Count: ${count}`}</GtkLabel>
            <GtkButton
                label="Increment"
                onClicked={() => setCount((c) => c + 1)}
                cssClasses={["suggested-action", "pill"]}
            />
        </GtkBox>
    );
};
```

`GtkButton` is the GObject class itself, and `onClicked` is its `clicked` signal. `@gtkx/gi` and `@gtkx/jsx` are per-project bindings the CLI generates, not packages you install from npm.

## Why Node.js, and why generated bindings

GTKX runs on Node.js. The established ways to reach GTK4 from JavaScript, GJS and node-gtk, each come with trade-offs GTKX set out to avoid.

GJS is GNOME's own JavaScript runtime, built on SpiderMonkey rather than V8. Because it is a separate runtime from Node.js, it cuts you off from native modules and from the npm packages and tooling built for Node.js APIs.

node-gtk does run on Node.js, but it is lightly maintained. Its native addon is C++ on the older nan/V8 ABI rather than N-API, and its documentation and examples still center on GTK3.

GTKX takes a different approach. It generates the TypeScript types and the native FFI calls from the same GObject-Introspection data, so the types cannot drift from the calls they back. The bindings cover the whole GTK4 and Adwaita surface rather than a hand-picked subset.

A GTKX app is an ordinary Node.js process, so you do everyday work with the Node standard library and npm. Use `node:fs` for files, `fetch` for HTTP, `setTimeout` and `setInterval` for timers, and any package on the registry for the rest. The generated GLib and Gio bindings come in only where the GNOME platform itself is the point, such as GSettings, desktop notifications, actions, and platform file objects via `Gio.File`.

At runtime, the native Rust core acquires the default GLib main context on the Node.js thread and drives it from the libuv event loop. It calls straight into the system GTK4 libraries through libffi, with no separate introspection layer (libgirepository) loaded at all. All native mutation stays on one thread.

## Next

- [Getting Started](/guide/getting-started): scaffold an app and run the dev loop.
- [Tutorial](/tutorial/): build a complete GNOME Tasks app, from the application shell to Flathub submission.
- [Components and Hooks](/guide/components-and-hooks): the model behind intrinsic elements, high-level components, and signals.
