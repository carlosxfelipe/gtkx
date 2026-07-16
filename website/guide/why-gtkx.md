---
description: "What GTKX is, why it exists, and how it compares to GJS and node-gtk, to portable subsets like React Native, and to webview stacks like Electron."
---

# Why GTKX

GTKX lets you build native GTK4 and Adwaita apps in TypeScript, with React components and hooks driving real GObject widgets. No webview, no Electron.

## A declarative layer for the GNOME stack

GTK4 is mature, and GtkBuilder XML can lay out a static interface, but nothing re-renders that interface when your application state changes, and nothing hot-reloads it as you work. GTKX adds that missing layer, and the tooling around it, on top of the stack you already know:

- a React reconciler that exposes every GObject as a JSX element,
- a CLI for scaffolding, development, and production builds,
- a dev server with Fast Refresh that patches your running UI in place,
- CSS-in-JS styling, spring and tween animations, and high-level list, grid, and dialog components,
- a Testing Library-style API for querying and driving your widgets in tests,
- and a Model Context Protocol (MCP) server that exposes your live app to AI agents.

## The full GNOME API surface, not a portable subset

React Native and similar frameworks hide the native toolkit so one API can run everywhere. GTKX does the opposite: it exposes GTK4, Adwaita, and any other GObject-Introspection library on your system, and is Linux-only by design.

Your JSX becomes live GObject instances, an actual `GtkButton`, an actual `AdwHeaderBar`. There is no canvas emulating widgets and no browser engine rendering HTML that imitates them. Apps built with GTKX inherit the native GNOME look and behavior because they are made of the same widgets GNOME apps are made of.

## Why Node.js, and why generated bindings

GTKX runs on Node.js. The two established ways to reach GTK4 from JavaScript, GJS and node-gtk, each come with trade-offs GTKX set out to avoid.

GJS is GNOME's own JavaScript runtime, built on SpiderMonkey rather than V8. Because it is a separate runtime from Node.js, it cuts you off from native modules and from the npm packages and tooling built for Node.js APIs.

node-gtk does run on Node.js, but it is lightly maintained. Its native addon is C++ on the older nan/V8 ABI rather than N-API, and its documentation and examples still center on GTK3.

GTKX takes a different approach. It generates the TypeScript types and the native FFI calls from the same GObject-Introspection data, so the types cannot drift from the calls they back, and they cover the whole GTK4 and Adwaita surface rather than a hand-picked subset.

Because a GTKX app is an ordinary Node.js process, everyday work is done with the Node standard library and npm: `node:fs` for files, `fetch` for HTTP, `setTimeout` and `setInterval` for timers, any package on the registry for the rest. The generated GLib and Gio bindings come in only where the GNOME platform itself is the point, such as GSettings, desktop notifications, actions, and platform file objects via `Gio.File`.

At runtime, the native Rust core owns the single GLib main loop and calls straight into the system GTK4 libraries through libffi, with no separate introspection layer (libgirepository) loaded at all. All native mutation stays on one thread.

## Next

The [tutorial](/tutorial/) walks through a complete GNOME Tasks app, from the application shell to Flathub submission, or you can jump straight to [Getting Started](/guide/getting-started) and scaffold an app of your own.
