---
description: "Build Tasks, a GNOME task manager, one running step at a time, and ship it as a Flatpak."
---

# Build a Tasks App with GTKX

<picture>
  <source srcset="/tasks-screenshot.webp" type="image/webp" />
  <img src="/tasks-screenshot.png" width="900" height="600" loading="lazy" alt="The Tasks app: an adaptive Adwaita window with a sidebar of smart views and colored user lists on the left, and a boxed task list on the right." />
</picture>

That is **Tasks**, a GNOME task manager you build here from an empty directory to a Flatpak on Flathub. Along the way you meet the pieces every GNOME app is made of: adaptive layout, settings, actions and accelerators, dialogs, and desktop notifications that keep working after the app closes.

You build it one running step at a time. After every chapter you have an app you can launch.

::: info Before you start
You need working familiarity with [React](https://react.dev/learn) and [TypeScript](https://www.typescriptlang.org/docs/handbook/2/basic-types.html). This tutorial teaches neither, and spends its words on GTK4 and Adwaita instead.

You also need Linux with the GTK4 development libraries and Node.js 24 or later. [Getting Started](/guide/getting-started) lists the system packages per distribution.
:::

## Check your setup

Check your Node.js version:

```bash
node --version
```

You should see 24 or later:

```
v24.18.0
```

Scaffold the project:

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

Answer the prompts like this:

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

Pick whichever package manager you use. The tutorial writes `npm run` in its commands: substitute freely.

The application ID takes reverse-DNS form, and changing it later orphans every setting a user has saved, so pick one you can live with. If you use your own, substitute it consistently from here on.

Start the app:

```bash
cd tasks
npm run dev
```

A small window opens with a counter in it. The next chapter replaces it.

::: warning Closing the window ends the session
If your terminal prints `Application quit - stopping dev runner...` and drops back to a shell prompt, you closed the Tasks window. The dev runner follows the app: when the app quits, the supervisor exits with it.

Keep this one `npm run dev` for the whole tutorial. Saving a `.ts` or `.tsx` file patches the running widget tree through Fast Refresh, so a `## Run it` section means "save and look at the open window". Saving `gtkx.config.ts` is handled for you too: the supervisor regenerates bindings and relaunches the app by itself. A chapter asks you to quit and relaunch only when the point of the check is what survives a restart.
:::

## How this tutorial works

Every chapter names a capability, adds it to an app that already runs, and ends with a `## Run it` section stating exactly what you should see. If you do not see it, something went wrong in that chapter and not three chapters ago.

Every code block carries its file path in the sentence directly above it. Edits to a file you already have appear as partials, with `// ...` standing in for lines you are leaving alone. No code block ever depends on a chapter you have not read yet.

## Scope

GNOME To Do is a mature application with years of work in it, and Tasks is smaller. What Tasks shares is the platform: the same GTK4 widgets, the same Adwaita patterns, the same settings, actions, and notifications. Finishing this tutorial leaves you able to open the To Do source and recognize what you are looking at.

## Next

Continue to [Your First Window](/tutorial/your-first-window).
