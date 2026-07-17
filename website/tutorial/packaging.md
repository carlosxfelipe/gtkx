---
description: "Ship the Tasks app: gtkx build, a standalone binary, a Flatpak manifest, desktop entry and AppStream metadata, and Flathub submission."
---

# Packaging and Shipping

A GTKX app is a Node.js program that renders native widgets, so shipping it means bundling the JavaScript, the native addon, and the compiled GSettings schema into something a user can install. This page turns the Tasks app into a standalone binary and a Flatpak.

## Building

`gtkx build` compiles the app for production:

```bash
npm run build   # gtkx build
```

It writes these things to `dist/`:

- `bundle.js`, the whole app as one JavaScript file,
- `gtkx.node`, the native addon that bridges to GTK4,
- `gschemas.compiled`, the compiled GSettings schema (emitted automatically because the app imports a `.gschema.xml`),
- `icons/`, the app icons copied from `data/icons/`.

At this point you can already run the app with `node dist/bundle.js`, provided GTK4 and Adwaita are installed on the machine.

`gtkx build` also takes `--asset-base <path>`, which resolves imported assets relative to the executable's directory instead of the bundle. Pass it when the binary and its data are installed to different prefixes, for example `gtkx build --asset-base ../share/my-app`.

## A single executable

To ship a binary that does not depend on a system Node.js, the tutorial bundles the app into a [Node.js Single Executable Application](https://nodejs.org/api/single-executable-applications.html) (SEA). The `package.json` wires this up:

```json
"scripts": {
  "bundle": "gtkx build && node scripts/bundle.ts",
  "bundle:postject": "node scripts/bundle-postject.ts",
  "build:sea": "bash scripts/build-sea.sh"
}
```

- `scripts/bundle.ts` re-bundles `dist/bundle.js` into a CommonJS file (`dist/bundle.cjs`) with a small shim that resolves `gtkx.node` next to the executable at runtime.
- `scripts/bundle-postject.ts` (the `bundle:postject` script) bundles the `postject` CLI into `vendor/postject.cjs`, so the sandboxed Flatpak build can inject the blob offline without fetching anything.
- `sea-config.json` tells Node.js what to embed:

```json
{
  "main": "dist/bundle.cjs",
  "output": "dist/sea-prep.blob",
  "disableExperimentalSEAWarning": true,
  "useCodeCache": true
}
```

- `build:sea` runs `node --experimental-sea-config sea-config.json` to produce the blob, copies the `node` binary to `dist/app`, and uses `postject` to inject the blob as an ELF section. The result is a standalone `dist/app` binary. It is not self-contained: both `gtkx.node` and `gschemas.compiled` are resolved next to the executable at runtime, so they ship alongside the binary.

Run the scripts in order to produce the binary:

```bash
npm run bundle && npm run bundle:postject && npm run build:sea
```

::: warning
The SEA blob is appended to the `node` binary as an ELF section. Stripping the binary would corrupt the embedded app, so any packaging step must leave it unstripped.
:::

## Flatpak

Flatpak is the standard way to distribute a GNOME app. The manifest at `flatpak/com.gtkx.tutorial.yaml` builds against the GNOME runtime and the Node.js SDK extension:

```yaml
id: com.gtkx.tutorial
runtime: org.gnome.Platform
runtime-version: "50"
sdk: org.gnome.Sdk
sdk-extensions:
  - org.freedesktop.Sdk.Extension.node24
command: gtkx-tutorial
finish-args:
  - --share=ipc
  - --socket=fallback-x11
  - --socket=wayland
  - --device=dri
```

The `finish-args` are intentionally minimal: no `--filesystem` permission is granted. The tasks store resolves its path from `process.env.XDG_DATA_HOME`, which Flatpak sets inside the sandbox (to `~/.var/app/com.gtkx.tutorial/data`), so its writes land in the app's own private data directory. Notifications are routed through the portal automatically, so `app.sendNotification` works without extra permissions.

The `build-options` point npm at the SDK's Node.js and turn off stripping:

```yaml
build-options:
  append-path: /usr/lib/sdk/node24/bin
  env:
    npm_config_nodedir: /usr/lib/sdk/node24
  no-debuginfo: true
  strip: false
```

The module builds the SEA and installs everything under `/app`:

```yaml
build-commands:
  - npm ci --offline
  - npm run bundle
  - npm run bundle:postject
  - node --experimental-sea-config sea-config.json
  - cp /usr/lib/sdk/node24/bin/node app
  - node vendor/postject.cjs app NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
  - install -Dm755 app /app/bin/gtkx-tutorial
  - install -Dm755 dist/gtkx.node /app/bin/gtkx.node
  - install -Dm644 data/com.gtkx.tutorial.gschema.xml /app/share/glib-2.0/schemas/com.gtkx.tutorial.gschema.xml
  - glib-compile-schemas /app/share/glib-2.0/schemas
  - install -Dm644 flatpak/com.gtkx.tutorial.desktop /app/share/applications/com.gtkx.tutorial.desktop
  - install -Dm644 flatpak/com.gtkx.tutorial.metainfo.xml /app/share/metainfo/com.gtkx.tutorial.metainfo.xml
  - install -Dm644 data/icons/hicolor/scalable/apps/com.gtkx.tutorial.svg /app/share/icons/hicolor/scalable/apps/com.gtkx.tutorial.svg
  - install -Dm644 data/icons/hicolor/symbolic/apps/com.gtkx.tutorial-symbolic.svg /app/share/icons/hicolor/symbolic/apps/com.gtkx.tutorial-symbolic.svg
```

These commands produce their own SEA binary the same way the local build does, injecting the blob into the SDK's `node` inside the sandbox, and install it as `gtkx-tutorial`. Installing and compiling the GSettings schema into `/app/share/glib-2.0/schemas` is what lets `useSetting` read and write preferences inside the sandbox.

The app icon lives in the project at `data/icons/hicolor/`, laid out exactly like the system icon theme: a scalable SVG named after the application ID, plus a 16×16 monochrome `-symbolic` variant. Both are drawn to the [GNOME app icon guidelines](https://developer.gnome.org/hig/guidelines/app-icons.html). Because the layout mirrors `share/icons`, the install commands are a straight copy. Outside the sandbox the icon resolves too. `gtkx dev` adds the `data/` directory to `XDG_DATA_DIRS`, and `gtkx build` copies `data/icons/` next to the bundle, so named lookups like the About dialog's `applicationIcon="com.gtkx.tutorial"` work in every environment.

## The desktop entry and AppStream metadata

The desktop entry and AppStream metadata integrate the app with the desktop. The `.desktop` entry lists it in the launcher and, for the Tasks app, opts into notifications:

```ini
[Desktop Entry]
Name=Tasks
GenericName=Task Manager
Comment=Manage your tasks and to-dos
Exec=gtkx-tutorial
Icon=com.gtkx.tutorial
Terminal=false
Type=Application
Categories=Office;ProjectManagement;
Keywords=Task;Tasks;Todo;To-do;Checklist;
StartupNotify=true
X-GNOME-UsesNotifications=true
DBusActivatable=true
```

`X-GNOME-UsesNotifications=true` surfaces the app in GNOME Settings under Notifications, and `DBusActivatable=true` lets the shell activate the app to deliver a reminder action even when it is not running.

The AppStream `metainfo.xml` provides the store listing: name, summary, description, screenshots, license, releases, and a content rating. Its `id` must match the application ID, and its `launchable` must point at the `.desktop` file.

Validate both before shipping:

```bash
npm run flatpak:lint
# desktop-file-validate flatpak/com.gtkx.tutorial.desktop
# appstreamcli validate --no-net flatpak/com.gtkx.tutorial.metainfo.xml
```

## Build and run the Flatpak

Vendor the dependencies, build in the sandbox, then install and run the result:

```bash
npm run flatpak:sources   # vendor deps into flatpak/generated-sources.json
npm run flatpak:build     # build the flatpak in a sandbox
flatpak install --user flatpak-repo com.gtkx.tutorial
flatpak run com.gtkx.tutorial
```

This needs `flatpak` and `flatpak-builder` with the Flathub remote configured, plus `flatpak-node-generator`, `desktop-file-validate`, and `appstreamcli`. The [flatpak README](https://github.com/gtkx-org/gtkx/tree/main/examples/tutorial/flatpak) lists them, and `flatpak:sources` fails with the `pipx` command to install `flatpak-node-generator` if it is missing.

## Submitting to Flathub

Once it builds and runs locally, open a pull request against the [flathub/flathub](https://github.com/flathub/flathub) repository that swaps the local `dir` source for a pinned `git` source of your published release.

## Next

You have built, run, tested, and packaged a complete GTKX application. Explore the [full source on GitHub](https://github.com/gtkx-org/gtkx/tree/main/examples/tutorial) and start your own app with `npm create gtkx@rc`.
