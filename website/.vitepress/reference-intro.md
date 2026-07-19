# API Reference

This reference documents the public API of every published GTKX package. It is generated from the TypeScript sources, so each signature here is the one your editor resolves.

Navigate by package from the list below. `@gtkx/react` holds the reconciler and the hooks for working with live GObjects, and `@gtkx/components` holds the high-level components. The remaining packages cover styling, testing, configuration, and a native Rust core. Each package page lists its exports grouped by kind.

Intrinsic elements such as `GtkButton` and `AdwApplicationWindow` are generated inside your project by codegen, from the libraries you declare in `gtkx.config.ts`, so the exact set depends on your configuration.

For a map of that layer and the components built on it, see [Components and Hooks](/guide/components-and-hooks). For per-element prop tables, run [`gtkx docs`](/guide/configuration-and-codegen#generating-element-reference-docs) in your project. For the behavior of the underlying widgets, consult the [GTK4](https://docs.gtk.org/gtk4/) and [Adwaita](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/) documentation.
