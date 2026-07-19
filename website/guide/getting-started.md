---
description: "Scaffold a GTKX app with npm create gtkx@rc, meet the CLI and the dev loop, and watch a GTK4 window hot-reload as you edit TypeScript."
---

# Getting Started

This guide will walk you through the creation of a new GTKX app using the CLI

## What you need

GTKX is Linux-only. You need:

- Linux with the GTK4 (4.20 or later) development libraries installed
- Node.js 24 or later

The native package (`@gtkx/native`) ships prebuilt binaries for x64 and arm64 glibc Linux.

## Scaffolding a new app

Start any new project with the official initializer:

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

It prompts for the project directory, an application ID in reverse-domain form, your package manager, and whether to include TypeScript and a Vitest testing setup.

```bash
npm create gtkx@rc -- my-app --yes --application-id com.example.myapp
cd my-app
npm run dev
```

This launches the app in dev mode. The generated starter is a tiny counter app showcasing the foundational capabilities of GTKX.

## Project structure

Here is what the scaffolder writes for the counter starter:

```
my-app/
├─ .gitignore            # node_modules/, dist/, *.log
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

## Configuration

`gtkx.config.ts` lets you configure your application and codegen. See [Configuration and Codegen](/guide/configuration-and-codegen) for every option and how the CLI turns them into typed bindings.

## The entry point: `src/index.tsx`

Mounting a GTKX tree looks exactly like React DOM:

```tsx
import { createRoot } from "@gtkx/react";
import { App } from "./app.js";

createRoot().render(<App />);
```

The counter starter wraps its window in `<GtkApplication>`; the Tasks app swaps that for `<AdwApplication>` (imported from `@gtkx/jsx/adw`) to pull in Adwaita, which initializes when its bindings load (see [Your First Window](/tutorial/your-first-window)). Either way, the application element picks up the `applicationId` from your config automatically.

## Next

With the project scaffolded and the dev server running, continue to [Configuration and Codegen](/guide/configuration-and-codegen) for the full option and codegen reference. To tour the Tasks app end to end, start the [Tutorial](/tutorial/).
