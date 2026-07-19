---
description: "Put an Adwaita window with a header bar on screen, and learn what mounted it."
---

# Your First Window

You have a scaffolded project that runs. Now replace its contents with the first piece of Tasks: an application, a window, and a header bar. If you skipped ahead, start at [the introduction](/tutorial/) and come back once `npm create gtkx@rc` has finished.

## What the scaffolder made

Open the `tasks` directory. Everything in it, ignoring `node_modules`:

```
tasks/
├── data/
├── src/
│   ├── app.tsx
│   ├── gtkx-env.d.ts
│   └── index.tsx
├── tests/
│   └── app.test.tsx
├── gtkx.config.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

`gtkx.config.ts` declares your application ID and the libraries codegen generates bindings for. `src/index.tsx` mounts the component tree. `src/app.tsx` is the one you work in, and it holds the counter demo you are about to delete. `src/gtkx-env.d.ts` points TypeScript at the generated bindings, which is why every widget you write is typed without importing a type.

`gtkx.config.ts`:

```ts
import { defineConfig } from "@gtkx/config";

export default defineConfig({
    libraries: ["Gtk-4.0", "Adw-1"],
    applicationId: "com.gtkx.tutorial",
});
```

Everything in this chapter comes from Adwaita rather than plain GTK4, so `Adw-1` needs to be in that list. If your application ID reads something else, change it to `com.gtkx.tutorial` now: the schema file, the notification identity, and the Flatpak all key off this string.

## The entry point

`src/index.tsx` stays as it is for the rest of the tutorial.

`src/index.tsx`:

```tsx
import { createRoot } from "@gtkx/react";
import { App } from "./app.js";

createRoot().render(<App />);
```

`createRoot()` gives you a React root backed by the GTKX reconciler, which is to GTK4 what React DOM is to the browser: it creates, updates, and destroys real GObject instances to match the tree your components return. With no argument it targets the process-level root, where an application element belongs.

::: tip Why does the import end in `.js`?
The project is ESM, so relative imports carry the extension the emitted file has, not the one on disk. You write `./app.js` and TypeScript resolves `./app.tsx`.
:::

## The application and its window

Replace the whole of `src/app.tsx` with this.

`src/app.tsx`:

```tsx
import { AdwApplication, AdwApplicationWindow } from "@gtkx/jsx/adw";
import { quit } from "@gtkx/react";

export function App() {
    return (
        <AdwApplication>
            <AdwApplicationWindow
                title="Tasks"
                widthRequest={360}
                heightRequest={294}
                onCloseRequest={() => quit()}
            />
        </AdwApplication>
    );
}
```

::: warning `Cannot find module '@gtkx/jsx/adw'`
The `libraries` list in `gtkx.config.ts` is missing `Adw-1`. The subpaths of `@gtkx/jsx` are generated one per library, so `./adw` exists only when `Adw-1` is in that list. Add it and save the config: the dev server watches `gtkx.config.ts`, prints `gtkx.config.ts changed; regenerating bindings...`, and restarts the app on its own.

The same error appears when the generated bindings are missing from `node_modules`. Codegen writes them into `node_modules/@gtkx/gi` and `node_modules/@gtkx/jsx`, so an install that prunes or rebuilds that tree takes them with it. Run `npm run codegen` to write them back.
:::

The rule behind both elements pays off for the rest of the tutorial: **a component's name is the GObject type name, verbatim**. `AdwApplicationWindow` is the widget `AdwApplicationWindow`; `GtkListBox` is `GtkListBox`. Anything in the [GTK4](https://docs.gtk.org/gtk4/) or [Adwaita](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/) documentation is already a component, with no wrapper to write and no list of supported widgets to check against.

Props follow from the same rule: they are that widget's GObject properties, camelCased, so `width-request` becomes `widthRequest`. Signals get the `on` prefix and PascalCase, so `close-request` is `onCloseRequest`, and here it calls `quit()` to end the process when you close the last window.

`AdwApplication` starts the `Gtk.Application` when it mounts, taking its application ID from `gtkx.config.ts`. `AdwApplicationWindow` presents itself when it mounts and destroys itself when it unmounts: rendering a window opens it, removing it from the tree closes it. There is no imperative `present()` call anywhere in this app.

The size floor is not arbitrary. 360 by 294 is the GNOME phone form factor, the smallest size a GNOME application is expected to survive. Committing to it now means the adaptive layout you build in [A Layout That Collapses](/tutorial/an-adaptive-layout) cannot quietly regress: any layout that stops working at that width fails while you are looking at it.

## Giving the window a header bar

An `AdwApplicationWindow` is freeform: its content area runs edge to edge with no titlebar, so nothing on screen carries the title you set and there is nothing to drag or close the window with. `AdwToolbarView` supplies that furniture, holding your content and stacking bars above and below it.

`src/app.tsx`:

```tsx
import {
    AdwApplication,
    AdwApplicationWindow,
    AdwHeaderBar,
    AdwStatusPage,
    AdwToolbarView,
} from "@gtkx/jsx/adw";
import { quit } from "@gtkx/react";

export function App() {
    return (
        <AdwApplication>
            <AdwApplicationWindow
                title="Tasks"
                widthRequest={360}
                heightRequest={294}
                onCloseRequest={() => quit()}
            >
                <AdwToolbarView topBar={<AdwHeaderBar />}>
                    <AdwStatusPage
                        iconName="checkbox-checked-symbolic"
                        title="No Tasks Yet"
                        description="Your tasks will show up here."
                    />
                </AdwToolbarView>
            </AdwApplicationWindow>
        </AdwApplication>
    );
}
```

`topBar` takes JSX, which is the other rule to carry forward: **some props are container slots rather than values**. A widget with more than one place to put a child exposes each place as its own prop, filled with an element exactly as you would fill `children`. Props like `sidebar`, `content`, `prefix`, and `suffix` all work this way.

The empty `AdwHeaderBar` picks up the window's `title` on its own and draws the window controls. `AdwStatusPage` is the standard Adwaita empty state: an icon, a title, and a line of explanation, centered in whatever space it is given.

## Run it

Save `src/app.tsx` and look at the window that has been open since the introduction. The counter is gone. In its place is a window 360 points wide at its narrowest, titled **Tasks** in a header bar, with a checkbox icon centered below it above the words **No Tasks Yet**.

Now change one string: set the status page title to `Nothing Here Yet` and save. The text in the open window changes. The window did not reopen, the process did not restart, and nothing flashed, because Fast Refresh patched the running widget tree in place. That is the loop you work in for the rest of the tutorial.

Set the title back to `No Tasks Yet` before moving on.

## Next

Continue to [Showing a List of Tasks](/tutorial/a-list-of-tasks).
