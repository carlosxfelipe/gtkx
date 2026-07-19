---
description: "What GTKX is, why it exists, and how it compares to GJS, node-gtk, and portable subsets like React Native."
---

# Why GTKX

GTK4 and Adwaita are mature, and GtkBuilder XML can lay out an interface and bind properties into it. The widget tree it builds is still fixed: keeping that structure in sync with your application state is left to imperative code you write yourself, and nothing hot-reloads the interface as you work. GTKX adds that missing layer, and the tooling around it, on top of the stack you already know:

- a React reconciler that exposes every GObject as a JSX element,
- a CLI for scaffolding, development, and production builds,
- a dev server with Fast Refresh that patches your running UI in place,
- CSS-in-JS styling and high-level list, grid, and dialog components,
- a Testing Library-style API for querying and driving your widgets in tests,
- and a Model Context Protocol (MCP) server that exposes your live app to AI agents.

## Why Node.js, and why not node-gtk/GJS

GTKX runs on Node.js. The established ways to reach GTK4 from JavaScript, GJS and node-gtk, each come with trade-offs GTKX set out to avoid.

GJS is GNOME's own JavaScript runtime, built on SpiderMonkey rather than V8. Because it is a separate runtime from Node.js, it cuts you off from native modules and from the npm packages and tooling built for Node.js APIs.

node-gtk does run on Node.js, but it is lightly maintained, and strict types are an afterthought coming from (the now deprecated) `ts-for-gir` node support. Its native addon is C++ on the older nan/V8 ABI rather than N-API, and its documentation and examples still center on GTK3.

GTKX takes a different approach. It generates the TypeScript types and the native FFI calls from the same GObject-Introspection data, so the types cannot drift from the calls they back.

## Next

- [Getting Started](/guide/getting-started): scaffold an app and run the dev loop.
- [Tutorial](/tutorial/): build a complete GNOME Tasks app, from the application shell to Flathub submission.
- [Components and Hooks](/guide/components-and-hooks): the model behind intrinsic elements, high-level components, and signals.
