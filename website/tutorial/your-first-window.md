---
description: "Put an Adwaita window with a header bar on screen, and learn what mounted it."
---

# Your First Window

You have a scaffolded project that runs, so now you replace its contents with the first piece of Tasks: an application, a window, and a header bar. If you skipped ahead, start at [the introduction](/tutorial/) and come back once `npm create gtkx@rc` has finished.

## What the scaffolder made

Open the `tasks` directory. This is everything in it, ignoring `node_modules`:

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

`gtkx.config.ts` declares your application ID and the libraries codegen generates bindings for. `src/index.tsx` mounts the component tree. `src/app.tsx` is the one you work in, and it holds the counter demo you are about to delete. `src/gtkx-env.d.ts` points TypeScript at those generated bindings, which is why every widget you write is typed without you importing a type.

Here is the config, unchanged from what your answers in the last chapter produced.

`gtkx.config.ts`:

```ts
import { defineConfig } from "@gtkx/config";

export default defineConfig({
    libraries: ["Gtk-4.0", "Adw-1"],
    applicationId: "com.gtkx.tutorial",
});
```

Both libraries are already there, which matters because everything in this chapter comes from Adwaita rather than plain GTK4. If your application ID reads something else, change it to `com.gtkx.tutorial` now: the schema file, the notification identity, and the Flatpak later in the tutorial all key off this string.

## The entry point

`src/index.tsx` is four lines and stays four lines for the rest of the tutorial.

`src/index.tsx`:

```tsx
import { createRoot } from "@gtkx/react";
import { App } from "./app.js";

createRoot().render(<App />);
```

`createRoot()` gives you a React root backed by the GTKX reconciler. The reconciler is to GTK4 what React DOM is to the browser: it takes the tree your components return and creates, updates, and destroys real GObject instances to match. Called with no argument it targets the process-level root, the place an application element belongs.

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

Two elements, and the rule behind both of them is the one that pays off for the rest of the tutorial: **a component's name is the GObject type name, verbatim**. `AdwApplicationWindow` is the widget `AdwApplicationWindow`. `GtkListBox` is `GtkListBox`. Anything you find in the [GTK4](https://docs.gtk.org/gtk4/) or [Adwaita](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/) documentation is already a component, with no wrapper to write and no list of supported widgets to check against.

Its props follow from the same rule: they are that widget's GObject properties, camelCased. `width-request` becomes `widthRequest`, `default-width` becomes `defaultWidth`. Signals get the `on` prefix and PascalCase, so the `close-request` signal is `onCloseRequest`, and here it calls `quit()` to end the process when you close the last window.

`AdwApplication` starts the `Gtk.Application` when it mounts, taking its application ID from `gtkx.config.ts`. `AdwApplicationWindow` presents itself when it mounts and destroys itself when it unmounts, which means rendering a window is how you open one and removing it from the tree is how you close one. There is no imperative `present()` call anywhere in this app.

The size floor deserves a sentence, because 360 by 294 is not arbitrary. It is the GNOME phone form factor, the smallest size a GNOME application is expected to survive. Committing to it now means the adaptive layout you build in [A Layout That Collapses](/tutorial/an-adaptive-layout) cannot quietly regress: any layout that stops working at that width fails while you are looking at it.

## Giving the window a header bar

An `AdwApplicationWindow` is a freeform window. Its content area runs edge to edge with no titlebar of its own, so nothing on screen carries the title you set, and there is nothing to drag or close the window with. `AdwToolbarView` supplies that missing furniture: it holds your content and stacks bars above and below it.

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

`topBar` is a prop that takes JSX. That is the third rule to carry forward: **some props are container slots rather than values**. A widget with more than one place to put a child exposes each place as its own prop, and you fill it with an element exactly as you would fill `children`. The header bar goes in `topBar`, the page content goes in the child position, and `AdwToolbarView` attaches each where it belongs. You will meet `sidebar`, `content`, `prefix`, `suffix`, and several more as the app grows, and they all work this way.

The empty `AdwHeaderBar` is doing real work: it picks up the window's `title` on its own, and it draws the window controls. `AdwStatusPage` is the standard Adwaita empty state, an icon with a title and a line of explanation, centered in whatever space it is given. Both stay only until the next chapter has actual rows to show.

## Run it

Start the dev server from the project directory:

```bash
npm run dev
```

::: warning No window appears?
If the process starts and then exits, or you see `cannot open display`, there is no display server for GTK4 to connect to. That happens over plain SSH, inside a container without a socket forwarded, and on a headless machine. Run it on a desktop session, or forward Wayland or X11 into the container. [Getting Started](/guide/getting-started) lists the system packages and the socket each backend needs.
:::

A window opens, 360 points wide at its narrowest, titled **Tasks** in a header bar, with a checkbox icon centered below it above the words **No Tasks Yet**.

Now leave it running and change one string. In `src/app.tsx`, set the status page title to `Nothing Here Yet` and save the file. The text in the open window changes. The window did not reopen, the process did not restart, and nothing flashed: Fast Refresh patched the running widget tree in place. That is the loop you will work in for the rest of the tutorial, so keep the dev server up.

Set the title back to `No Tasks Yet` before moving on.

## Summary

- **The reconciler drives GObject instances the way React DOM drives elements**, and `createRoot()` with no argument targets the process-level root.
- **A component's name is the GObject type name verbatim**, so every widget in the GTK4 and Adwaita documentation is already available to you.
- **Props are that widget's GObject properties in camelCase**, and signals are `on` plus the signal name in PascalCase.
- **Mounting an application element starts the application; mounting a window element opens it.**
- **A container slot is a prop that takes JSX**, which is how `AdwToolbarView` gets its header bar.
- **Fast Refresh patches the running window**, so saving a file is the whole edit cycle.

## Next

Continue to [Showing a List of Tasks](/tutorial/a-list-of-tasks).
