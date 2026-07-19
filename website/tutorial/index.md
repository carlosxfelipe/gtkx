---
description: "Build Tasks, a GNOME task manager, one running step at a time, and ship it as a Flatpak."
---

# Build a Tasks App with GTKX

<picture>
  <source srcset="/tasks-screenshot.webp" type="image/webp" />
  <img src="/tasks-screenshot.png" width="900" height="600" loading="lazy" alt="The Tasks app: an adaptive Adwaita window with a sidebar of smart views and colored user lists on the left, and a boxed task list on the right." />
</picture>

That is **Tasks**, and by the end of this tutorial it is yours. A sidebar holds smart views (All Tasks, Today, Important, Trash) alongside your own colored lists, each with a badge counting what is still open. The pane on the right shows the tasks in the current view: type into the row at the top to add one, tick a checkbox to complete it, star it, or delete it to Trash. Opening a task slides in an editor with a title, an Important switch, a due date picked from a calendar, and notes. You can filter, search, sort, and drag rows into the order you want. The window remembers its size, follows the system light or dark theme, collapses to a single pane when you make it narrow, and answers the keyboard shortcuts a GNOME user already knows. Reminders arrive as desktop notifications with a Mark Complete button that works even when the app is closed.

You will build it one running step at a time. After every chapter you have an app you can launch.

::: info What you will build
In the order the chapters deliver it:

- A window that opens, remembers its size, and follows the system theme
- A list of tasks on screen, then a store behind it so you can add your own
- Completing, starring, and deleting, saved to disk between runs
- Your own lists, a sidebar to switch between them, and a layout that collapses on a narrow screen
- Smart views, filters, and search
- A task editor with a due date and notes
- A menu, keyboard accelerators, and a shortcuts window
- Undoable deletion with toasts, and a Trash that asks before it empties
- Preferences, drag-to-reorder, and desktop reminders
- Tests, a single-file executable, and a Flatpak
:::

::: info Before you start
You need working familiarity with [React](https://react.dev/learn) and [TypeScript](https://www.typescriptlang.org/docs/handbook/2/basic-types.html). This tutorial teaches neither: it assumes you know what a component, a hook, and a type annotation are, and spends its words on GTK4 and Adwaita instead.

You also need Linux with the GTK4 development libraries and Node.js 24 or later. [Getting Started](/guide/getting-started) lists the system packages per distribution.
:::

## Check your setup

Before writing anything, confirm the toolchain. Check your Node.js version:

```bash
node --version
```

You should see 24 or later:

```
v24.18.0
```

Now scaffold the project:

::: code-group

```bash [npm]
npm create gtkx@rc
```

```bash [pnpm]
pnpm create gtkx@rc
```

```bash [yarn]
yarn create gtkx@rc
```

:::

The scaffolder asks a handful of questions. Answer them like this:

```
┌  Create GTKX App
│
◇  Project directory
│  tasks
│
◇  Application ID
│  com.gtkx.tutorial
│
◇  Package manager
│  npm
│
◇  Use TypeScript?
│  Yes
│
◇  Include testing setup (Vitest)?
│  Yes
│
└  Project structure created
```

Pick whichever package manager you actually use. The rest of this tutorial writes `npm run` in its commands: substitute freely.

The application ID deserves a moment. `com.gtkx.tutorial` is not decoration. GTK4 uses it as the D-Bus name that keeps a second launch from opening a second copy, GSettings uses it as the schema id under which your preferences live, the desktop uses it to attribute notifications to your app, and Flatpak uses it as the bundle name a stranger types to install you. Reverse-DNS form is required: at least two dot-separated parts. Changing it later orphans every setting a user has saved, so choose one you can live with. If you use your own, substitute it consistently from here on.

Then start the app:

```bash
cd tasks
npm run dev
```

A small window opens with a counter in it. That is the starter, and the next chapter replaces it. Leave `npm run dev` running: it watches your files and reloads the app as you save. That is the dev loop, and it is the only command you need for the whole core tutorial.

::: warning If the window never appears
`Gtk-WARNING: cannot open display` means there is no display server to draw on. GTK4 needs a running Wayland or X11 session, so run this from a desktop session rather than a bare SSH shell. [Getting Started](/guide/getting-started) covers what to install.
:::

## How this tutorial works

Every chapter names a capability, adds it to an app that already runs, and ends with a `## Run it` section stating exactly what you should see. If you do not see it, something went wrong in that chapter and not three chapters ago.

Every code block carries its file path in the sentence directly above it. A file appears in full when you create it, and again in full as a checkpoint at the end of the chapter that finishes it. Edits to a file you already have appear as partials, with `// ...` standing in for lines you are leaving alone. No code block ever depends on a chapter you have not read yet.

Copying and pasting is expected. Typing it out is better, but nobody is watching.

## The arc

Chapters two through six put a working task list on screen and save it to disk. Chapters seven through fifteen turn that list into a GNOME application: navigation, editing, commands, settings, and notifications. The three appendices test it, package it as a single executable, and ship it on Flathub.

## Honest scope

GNOME To Do is a mature application with years of work in it, and Tasks is smaller. What Tasks does share is the platform: the same GTK4 widgets, the same Adwaita patterns, the same settings, actions, and notifications. Finishing this tutorial leaves you able to open the To Do source and recognize what you are looking at.

Some things are deliberately left out of the build. Batch-editing several tasks at once, recurring tasks, syncing across devices, and translating the interface all fit the app cleanly but would each stretch a chapter past its welcome. They wait for you as challenges at the end of the core spine, once you know enough to take them on without a walkthrough.

## Next

Continue to [Your First Window](/tutorial/your-first-window).
